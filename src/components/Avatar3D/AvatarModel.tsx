/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useFBX, Center, useKeyboardControls } from '@react-three/drei';
import { 
  MathUtils, 
  AnimationAction, 
  LoopRepeat, 
  Vector3, 
  Quaternion, 
  AnimationMixer, 
  Group, 
  Mesh, 
  Object3D, 
  SkinnedMesh, 
  Skeleton, 
  Bone, 
  AnimationClip, 
  KeyframeTrack,
  AnimationUtils // <--- IMPORT THIS
} from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { useLipSync } from './lipsync'; 

type AvatarModelProps = {
  position?: [number, number, number];
  scale?: number;
  controlsEnabled?: boolean;
  onPositionUpdate?: (position: [number, number, number]) => void;
  onRotationUpdate?: (rotation: number) => void;
};

export default function AvatarModel({ 
  position = [0, 0, 0], 
  scale = 1, 
  controlsEnabled = false,
  onPositionUpdate,
  onRotationUpdate
}: AvatarModelProps) {
  const groupRef = useRef<Group>(null);
  const mixerRef = useRef<AnimationMixer | null>(null);
  
  // 1. LOAD ASSETS
  const gltf = useGLTF('/models/self.glb');
  const idleFbx = useFBX('/animations/window.fbx');
  const talkFbx = useFBX('/animations/Talking.fbx');
  const walkFbx = useFBX('/animations/walk.fbx');
  const runFbx = useFBX('/animations/running.fbx');

  // 2. CONTEXT
  const { analyser, isPlaying } = useLipSync();
  const [, getKeys] = useKeyboardControls();
  const dataArray = useRef<Uint8Array>(new Uint8Array(0));

  const clonedScene = useMemo(() => SkeletonUtils.clone(gltf.scene), [gltf.scene]);
  
  const headMeshRef = useRef<Mesh | null>(null);
  const teethMeshRef = useRef<Mesh | null>(null);

  // Movement State
  const rotationTarget = useRef(0);
  const currentSpeed = useRef(0); 
  
  // Animation State
  const actions = useRef<{ 
    idle: AnimationAction | null; 
    talk: AnimationAction | null; 
    walk: AnimationAction | null;
    run: AnimationAction | null;
  }>({ 
    idle: null, talk: null, walk: null, run: null
  });
  const currentActionName = useRef<'idle' | 'talk' | 'walk' | 'run'>('idle');

  // --- HELPER: RETARGET ANIMATION ---
  const retargetClip = (sourceClip: AnimationClip, skeleton: Skeleton) => {
    const bones = skeleton.bones as Bone[];
    const retargetedTracks: KeyframeTrack[] = [];

    sourceClip.tracks.forEach((track) => {
      const trackParts = track.name.split('.');
      const boneName = trackParts[0];
      const property = trackParts.slice(1).join('.');

      // Remove Root Motion
      if (property === 'position' && (boneName.toLowerCase().includes('hips') || boneName.toLowerCase().includes('root'))) {
        return; 
      }

      const matchingBone = bones.find((bone: Bone) => {
        if (bone.name === boneName) return true;
        const cleanBoneName = boneName.replace(/^mixamorig/i, '');
        const cleanAvatarName = bone.name.replace(/^(mixamorig|Armature_)/i, '');
        return cleanAvatarName.toLowerCase() === cleanBoneName.toLowerCase();
      });

      if (matchingBone) {
        const newTrackName = `${matchingBone.name}.${property}`;
        const TrackConstructor = (track as any).constructor;
        retargetedTracks.push(new TrackConstructor(newTrackName, track.times, track.values));
      }
    });

    return new AnimationClip(sourceClip.name, sourceClip.duration, retargetedTracks);
  };

  // --- SETUP MESHES ---
  useEffect(() => {
    clonedScene.traverse((obj: Object3D) => {
      if ((obj as Mesh).isMesh) {
        const mesh = obj as Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (mesh.name === 'Wolf3D_Head') headMeshRef.current = mesh;
        if (mesh.name === 'Wolf3D_Teeth') teethMeshRef.current = mesh;
      }
    });
  }, [clonedScene]);

  // --- SETUP ANIMATIONS (WITH TRIM LOGIC) ---
  useEffect(() => {
    if (!clonedScene || !idleFbx || !talkFbx || !walkFbx || !runFbx) return;

    if (mixerRef.current) mixerRef.current.stopAllAction();
    mixerRef.current = new AnimationMixer(clonedScene);
    
    let avatarSkeleton: Skeleton | null = null;
    clonedScene.traverse((child: Object3D) => {
      if (child instanceof SkinnedMesh) avatarSkeleton = child.skeleton as Skeleton;
    });

    if (avatarSkeleton) {
      // 1. Idle
      const idleClip = retargetClip(idleFbx.animations[0], avatarSkeleton);
      const idleAction = mixerRef.current.clipAction(idleClip);
      actions.current.idle = idleAction;

      // 2. Talk
      const talkClip = retargetClip(talkFbx.animations[0], avatarSkeleton);
      const talkAction = mixerRef.current.clipAction(talkClip);
      talkAction.loop = LoopRepeat;
      actions.current.talk = talkAction;

      // 3. Walk (TRIMMED)
      const walkOriginal = walkFbx.animations[0];
      const walkTrimmed = AnimationUtils.subclip(walkOriginal, 'walkTrimmed', 30, Math.floor(walkOriginal.duration * 30), 30);
      const walkClip = retargetClip(walkTrimmed, avatarSkeleton);
      const walkAction = mixerRef.current.clipAction(walkClip);
      walkAction.loop = LoopRepeat;
      actions.current.walk = walkAction;

      // 4. Run
      const runClip = retargetClip(runFbx.animations[0], avatarSkeleton);
      const runAction = mixerRef.current.clipAction(runClip);
      runAction.loop = LoopRepeat;
      actions.current.run = runAction;

      // START
      idleAction.play();
      currentActionName.current = 'idle';
    }

    return () => {
      mixerRef.current?.stopAllAction();
      mixerRef.current = null;
    };
  }, [clonedScene, idleFbx, talkFbx, walkFbx, runFbx]);

  // --- TRANSITION SYSTEM ---
  const fadeToAction = (targetName: 'idle' | 'talk' | 'walk' | 'run') => {
    const nextAction = actions.current[targetName];
    const prevAction = actions.current[currentActionName.current];

    if (!nextAction || nextAction === prevAction) return;

    // Fast transition for movement to look responsive
    const duration = (targetName === 'walk' || targetName === 'run') ? 0.15 : 0.3;

    if (prevAction) prevAction.fadeOut(duration);

    nextAction
      .reset()
      .setEffectiveTimeScale(1)
      .setEffectiveWeight(1)
      .fadeIn(duration)
      .play();

    currentActionName.current = targetName;
  };

  // --- FRAME LOOP ---
  useFrame((state, delta) => {
    if (mixerRef.current) mixerRef.current.update(delta);

    const keys = getKeys();
    const isMoving = controlsEnabled && (keys.forward || keys.backward || keys.left || keys.right);
    
    // 1. ANIMATION SELECTION
    let desiredAnim: 'idle' | 'talk' | 'walk' | 'run' = 'idle';
    if (isMoving) {
      desiredAnim = keys.run ? 'run' : 'walk';
    } else if (isPlaying) {
      desiredAnim = 'talk';
    }

    // 2. TRIGGER TRANSITION
    if (desiredAnim !== currentActionName.current) {
      fadeToAction(desiredAnim);
    }

    // 3. PHYSICS
    if (groupRef.current) {
        // Target speed logic
        const targetSpeed = isMoving ? (keys.run ? 5.0 : 2.5) : 0;
        
        // Smooth acceleration (LERP)
        currentSpeed.current = MathUtils.lerp(currentSpeed.current, targetSpeed, 0.1);

        if (currentSpeed.current > 0.05) {
            const direction = new Vector3();
            if (keys.forward) direction.z -= 1;
            if (keys.backward) direction.z += 1;
            if (keys.left) direction.x -= 1;
            if (keys.right) direction.x += 1;

            if (direction.length() > 0) {
                direction.normalize();
                
                // CAMERA-RELATIVE MOVEMENT
                // Get the angle of the camera manually
                const camera = state.camera;
                const cameraRotation = Math.atan2(
                  camera.position.x - groupRef.current.position.x,
                  camera.position.z - groupRef.current.position.z
                );
                
                // Calculate the final rotation target based on camera orientation
                rotationTarget.current = Math.atan2(direction.x, direction.z) + cameraRotation + Math.PI;

                const targetQuaternion = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), rotationTarget.current);
                groupRef.current.quaternion.slerp(targetQuaternion, 0.2);

                if (onRotationUpdate) {
                    onRotationUpdate(rotationTarget.current);
                }
            }
            
            const forwardVec = new Vector3(0, 0, 1).applyQuaternion(groupRef.current.quaternion);
            groupRef.current.position.add(forwardVec.multiplyScalar(currentSpeed.current * delta));
            
            // Notify parent about position update for camera tracking
            if (onPositionUpdate) {
                onPositionUpdate([groupRef.current.position.x, groupRef.current.position.y, groupRef.current.position.z]);
            }
        }
        
        // Sync Animation Speeds
        if (actions.current.walk) {
           actions.current.walk.timeScale = currentSpeed.current / 2.5;
        }
        if (actions.current.run) {
           actions.current.run.timeScale = currentSpeed.current / 5.0;
        }
    }

    // 4. LIP SYNC
    if (analyser && headMeshRef.current && headMeshRef.current.morphTargetInfluences) {
        if (dataArray.current.length !== analyser.frequencyBinCount) {
          dataArray.current = new Uint8Array(analyser.frequencyBinCount);
        }
        analyser.getByteFrequencyData(dataArray.current as any);
        let sum = 0;
        const freqRange = 30; 
        for (let i = 0; i < freqRange; i++) sum += dataArray.current[i];
        const average = sum / freqRange;
        let targetValue = (average / 255) * 2.5; 
        targetValue = Math.min(1, Math.max(0, targetValue - 0.1)); 
        const currentInfluence = headMeshRef.current.morphTargetInfluences[0];
        headMeshRef.current.morphTargetInfluences[0] = MathUtils.lerp(currentInfluence, targetValue, 0.5);
        if (teethMeshRef.current && teethMeshRef.current.morphTargetInfluences) {
          teethMeshRef.current.morphTargetInfluences[0] = headMeshRef.current.morphTargetInfluences[0];
        }
    } else if (!isPlaying && headMeshRef.current && headMeshRef.current.morphTargetInfluences) {
        headMeshRef.current.morphTargetInfluences[0] = MathUtils.lerp(headMeshRef.current.morphTargetInfluences[0], 0, 0.2);
        if (teethMeshRef.current && teethMeshRef.current.morphTargetInfluences) {
          teethMeshRef.current.morphTargetInfluences[0] = headMeshRef.current.morphTargetInfluences[0];
        }
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <Center bottom>
        <primitive object={clonedScene} scale={scale} />
      </Center>
    </group>
  );
}

useGLTF.preload('/models/self.glb');
useFBX.preload('/animations/window.fbx');
useFBX.preload('/animations/Talking.fbx'); 
useFBX.preload('/animations/walk.fbx');
useFBX.preload('/animations/running.fbx');