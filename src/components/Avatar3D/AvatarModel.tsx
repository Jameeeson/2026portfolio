'use client';

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useFBX, Center } from '@react-three/drei';
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
  DoubleSide,
  MeshStandardMaterial 
} from 'three';
import { SkeletonUtils } from 'three-stdlib';

type AvatarModelProps = {
  position?: [number, number, number];
  scale?: number;
};

export default function AvatarModel({ position = [0, 0, 0], scale = 1 }: AvatarModelProps) {
  const groupRef = useRef<Group>(null);
  const mixerRef = useRef<AnimationMixer | null>(null);
  const gltf = useGLTF('/models/self.glb');
  const fbx = useFBX('/animations/window.fbx');
  
  const clonedScene = SkeletonUtils.clone(gltf.scene);

  // --- DIAGNOSTIC SCANNER ---
  useEffect(() => {
    const allBones: string[] = [];
    const morphTargets: Record<string, string[]> = {};

    clonedScene.traverse((obj: Object3D) => {
      // 1. Log Bones
      if ((obj as Bone).isBone) {
        allBones.push(obj.name);
      }

      // 2. Log Meshes with Shape Keys (Morph Targets)
      if ((obj as Mesh).isMesh) {
        const mesh = obj as Mesh;
        // Fix shadows while we are here
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (mesh.morphTargetDictionary) {
          // Record the mesh name and all available keys
          morphTargets[mesh.name] = Object.keys(mesh.morphTargetDictionary);
        }
      }
    });

    // PRINT REPORT TO CONSOLE
    console.group('🔍 MODEL DIAGNOSTIC REPORT');
    
    console.log(`%c🦴 BONES FOUND (${allBones.length})`, 'color: #4ade80; font-weight: bold; font-size: 12px');
    console.log(allBones);

    console.log(`%c🙂 MORPH TARGETS (FACE SHAPES)`, 'color: #60a5fa; font-weight: bold; font-size: 12px');
    if (Object.keys(morphTargets).length === 0) {
      console.warn("❌ No Morph Targets found! (Model cannot blink or change expressions)");
    } else {
      Object.entries(morphTargets).forEach(([meshName, keys]) => {
        console.log(`Mesh: "${meshName}" has ${keys.length} shapes:`, keys);
      });
    }
    
    console.groupEnd();

  }, [clonedScene]);
  
  // Standard Animation Setup (Minimal)
  useEffect(() => {
    if (clonedScene && fbx.animations && fbx.animations.length > 0) {
      mixerRef.current = new AnimationMixer(clonedScene);
      const mixamoAnimation = fbx.animations[0];
      
      let avatarSkeleton: Skeleton | null = null;
      clonedScene.traverse((child: Object3D) => {
        if (child instanceof SkinnedMesh) avatarSkeleton = child.skeleton as Skeleton;
      });

      if (avatarSkeleton) {
        const bones = (avatarSkeleton as Skeleton).bones as Bone[];
        const retargetedTracks: KeyframeTrack[] = [];
        
        mixamoAnimation.tracks.forEach((track) => {
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
        
        if (retargetedTracks.length > 0) {
          const retargetedClip = new AnimationClip(mixamoAnimation.name, mixamoAnimation.duration, retargetedTracks);
          const action = mixerRef.current.clipAction(retargetedClip);
          action.play();
        }
      }
    }
    return () => { mixerRef.current?.stopAllAction(); };
  }, [clonedScene, fbx]);

  useFrame((state, delta) => mixerRef.current?.update(delta));

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