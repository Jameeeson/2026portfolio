'use client';

import { useGLTF } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';

type BuildingProps = {
  path: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  usePhysics?: boolean; // Set to true if you want the character to collide with it
};

/**
 * A reusable template for adding GLB buildings to the scene.
 * Usage: <Building path="/buildings/house.glb" position={[10, 0, 5]} />
 */
export default function Building({ 
  path, 
  position = [0, 0, 0], 
  rotation = [0, 0, 0], 
  scale = 1,
  usePhysics = true, 
}: BuildingProps) {
  const { scene } = useGLTF(path);

  // Clone the scene so we can use the same GLB multiple times in one world
  const clonedScene = scene.clone();

  const BuildingMesh = (
    <primitive 
      object={clonedScene} 
      castShadow 
      receiveShadow 
    />
  );

  if (usePhysics) {
    return (
      <RigidBody 
        type="fixed" 
        colliders="trimesh" 
        position={position} 
        rotation={rotation} 
        scale={Array.isArray(scale) ? scale : [scale, scale, scale]}
      >
        {BuildingMesh}
      </RigidBody>
    );
  }

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {BuildingMesh}
    </group>
  );
}

// Preload helper to prevent popping in
