/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useFBX, Center } from '@react-three/drei';
import { MathUtils, AnimationAction, LoopRepeat } from 'three';
import { 
  Group, 
  AnimationMixer, 
  SkinnedMesh, 
  Skeleton, 
  Bone, 
  AnimationClip, 
  KeyframeTrack, 
  Object3D, 
  Mesh, 
} from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { useLipSync } from './lipsync'; 

type AvatarModelProps = {
  position?: [number, number, number];
  scale?: number;
};

export default function AvatarModel({ position = [0, 0, 0], scale = 1 }: AvatarModelProps) {
  const groupRef = useRef<Group>(null);
  const mixerRef = useRef<AnimationMixer | null>(null);
  
  // 1. LOAD ASSETS
  const gltf = useGLTF('/models/self.glb');
  const idleFbx = useFBX('/animations/window.fbx');   // Your Idle animation
  const talkFbx = useFBX('/animations/Talking.fbx');  // NEW: Talking animation

  // 2. GET CONTEXT
  const { analyser, isPlaying } = useLipSync(); // We need isPlaying state
  const dataArray = useRef<Uint8Array>(new Uint8Array(0));

  const clonedScene = SkeletonUtils.clone(gltf.scene);
  const headMeshRef = useRef<Mesh | null>(null);
  const teethMeshRef = useRef<Mesh | null>(null);

  // Store actions to crossfade later
  const actions = useRef<{ idle: AnimationAction | null; talk: AnimationAction | null }>({ 
    idle: null, 
    talk: null 
  });

  // --- HELPER: RETARGET ANIMATION ---
  // This extracts the Mixamo retargeting logic so we can reuse it for both clips
  const retargetClip = (sourceClip: AnimationClip, skeleton: Skeleton) => {
    const bones = skeleton.bones as Bone[];
    const retargetedTracks: KeyframeTrack[] = [];

    sourceClip.tracks.forEach((track) => {
      const trackParts = track.name.split('.');
      const boneName = trackParts[0];
      const property = trackParts.slice(1).join('.');

      if (property === 'position') {
        if (boneName.toLowerCase().includes('hips') || boneName.toLowerCase().includes('root')) return;
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

  // --- SETUP ANIMATIONS (IDLE & TALK) ---
  useEffect(() => {
    if (clonedScene && idleFbx.animations.length > 0 && talkFbx.animations.length > 0) {
      mixerRef.current = new AnimationMixer(clonedScene);
      
      // Find Skeleton
      let avatarSkeleton: Skeleton | null = null;
      clonedScene.traverse((child: Object3D) => {
        if (child instanceof SkinnedMesh) avatarSkeleton = child.skeleton as Skeleton;
      });

      if (avatarSkeleton) {
        // 1. Prepare Idle Action
        const idleClip = retargetClip(idleFbx.animations[0], avatarSkeleton);
        const idleAction = mixerRef.current.clipAction(idleClip);
        idleAction.play(); // Start playing Idle immediately
        actions.current.idle = idleAction;

        // 2. Prepare Talk Action
        const talkClip = retargetClip(talkFbx.animations[0], avatarSkeleton);
        const talkAction = mixerRef.current.clipAction(talkClip);
        // Don't play yet, just store it
        talkAction.loop = LoopRepeat;
        actions.current.talk = talkAction;
      }
    }
    return () => { mixerRef.current?.stopAllAction(); };
  }, [clonedScene, idleFbx, talkFbx]);

  // --- HANDLE CROSSFADE WHEN AUDIO PLAYS/STOPS ---
  useEffect(() => {
    const { idle, talk } = actions.current;
    if (!idle || !talk) return;

    const transitionDuration = 0.5; // Smooth fade over 0.5 seconds

    if (isPlaying) {
      // Switch to Talking
      idle.fadeOut(transitionDuration);
      talk.reset().fadeIn(transitionDuration).play();
    } else {
      // Switch back to Idle
      talk.fadeOut(transitionDuration);
      idle.reset().fadeIn(transitionDuration).play();
    }
  }, [isPlaying]); // Triggers whenever isPlaying changes

  // --- FRAME LOOP (LIP SYNC) ---
  useFrame((state, delta) => {
    mixerRef.current?.update(delta);

    // LIP SYNC LOGIC (With your high-frequency tweaks)
    if (analyser && headMeshRef.current && headMeshRef.current.morphTargetInfluences) {
      
      if (dataArray.current.length !== analyser.frequencyBinCount) {
        dataArray.current = new Uint8Array(analyser.frequencyBinCount);
      }
      analyser.getByteFrequencyData(dataArray.current as any);

      let sum = 0;
      const freqRange = 30; 
      for (let i = 0; i < freqRange; i++) {
        sum += dataArray.current[i];
      }
      const average = sum / freqRange;

      // High sensitivity settings
      const sensitivity = 2.0; 
      let targetValue = (average / 255) * sensitivity;

      if (targetValue < 0.15) targetValue = 0; // Noise gate
      targetValue = Math.min(1, targetValue);

      const currentInfluence = headMeshRef.current.morphTargetInfluences[0];
      const smoothValue = MathUtils.lerp(currentInfluence, targetValue, 0.6); // Fast smoothing

      headMeshRef.current.morphTargetInfluences[0] = smoothValue;
      if (teethMeshRef.current && teethMeshRef.current.morphTargetInfluences) {
        teethMeshRef.current.morphTargetInfluences[0] = smoothValue;
      }
    } else if (headMeshRef.current && headMeshRef.current.morphTargetInfluences) {
      // Close mouth
      const closedValue = MathUtils.lerp(headMeshRef.current.morphTargetInfluences[0], 0, 0.5);
      headMeshRef.current.morphTargetInfluences[0] = closedValue;
      if (teethMeshRef.current && teethMeshRef.current.morphTargetInfluences) {
        teethMeshRef.current.morphTargetInfluences[0] = closedValue;
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
useFBX.preload('/animations/Talking.fbx'); // Preload the new file