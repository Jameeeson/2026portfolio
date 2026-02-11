'use client';

import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, KeyboardControls } from '@react-three/drei';
import { useEffect, useRef, useMemo, useState } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Vector3 } from 'three';
import styles from './Avatar3D.module.css';
import AvatarModel from './AvatarModel';

// --- 1. CONFIGURATION ---
const CONFIG = {
  AVATAR: {
    position: [0, 1.8, 0] as [number, number, number],
    scale: 1
  },
  CAMERA: {
    position: [-0.0119, 1.733, 1.314] as [number, number, number],
    target: [-0.06, 1.231, -0.093] as [number, number, number],
    fov: 50
  }
};

// --- 2. HELPER COMPONENT: LOG ON "L" KEY ---
const CameraLogger = ({ controlsRef }: { controlsRef: React.RefObject<OrbitControlsImpl | null> }) => {
  const { camera } = useThree();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Press 'l' or 'L' to log
      if (event.key.toLowerCase() === 'l') {
        if (controlsRef.current) {
          const p = camera.position;
          const t = controlsRef.current.target;
          
          // Create clean object with 3 decimal places
          const logData = {
            CAMERA: {
              position: [Number(p.x.toFixed(3)), Number(p.y.toFixed(3)), Number(p.z.toFixed(3))],
              target: [Number(t.x.toFixed(3)), Number(t.y.toFixed(3)), Number(t.z.toFixed(3))],
              fov: 50
            }
          };

          console.log('📸 CAMERA SNAPSHOT:', JSON.stringify(logData));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [camera, controlsRef]);

  return null;
};

type Avatar3DProps = {
  controlsEnabled?: boolean;
};

export default function Avatar3D({ controlsEnabled = false }: Avatar3DProps) {
  // We need a ref to access the OrbitControls internal target
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [avatarPos, setAvatarPos] = useState<[number, number, number]>(CONFIG.AVATAR.position);
  const [avatarRotation, setAvatarRotation] = useState<number>(0);

  // Offset from character to camera (computed from initial CONFIG values)
  const initialOffset = useMemo(() => {
    return {
      pos: new Vector3(
        CONFIG.CAMERA.position[0] - CONFIG.AVATAR.position[0],
        CONFIG.CAMERA.position[1] - CONFIG.AVATAR.position[1],
        CONFIG.CAMERA.position[2] - CONFIG.AVATAR.position[2]
      ),
      target: new Vector3(
        CONFIG.CAMERA.target[0] - CONFIG.AVATAR.position[0],
        CONFIG.CAMERA.target[1] - CONFIG.AVATAR.position[1],
        CONFIG.CAMERA.target[2] - CONFIG.AVATAR.position[2]
      )
    };
  }, []);

  // Return camera to front of character when chat is toggled back
  useEffect(() => {
    if (!controlsEnabled && controlsRef.current) {
      const controls = controlsRef.current;
      const camera = controls.object;

      // 1. Calculate camera position relative to character's FACING direction
      // We rotate the initial relative offset by the character's current rotation
      const rotatedPosOffset = initialOffset.pos.clone().applyAxisAngle(new Vector3(0, 1, 0), avatarRotation);
      const rotatedTargetOffset = initialOffset.target.clone().applyAxisAngle(new Vector3(0, 1, 0), avatarRotation);

      const newPos = new Vector3(avatarPos[0], avatarPos[1], avatarPos[2]).add(rotatedPosOffset);
      const newTarget = new Vector3(avatarPos[0], avatarPos[1], avatarPos[2]).add(rotatedTargetOffset);

      // Instantly move
      camera.position.set(newPos.x, newPos.y, newPos.z);
      controls.target.set(newTarget.x, newTarget.y, newTarget.z);
      controls.update();
    }
  }, [controlsEnabled, avatarPos, avatarRotation, initialOffset]);

  const map = useMemo(() => [
    { name: 'forward', keys: ['ArrowDown', 'KeyS'] },
    { name: 'backward', keys: ['ArrowUp', 'KeyW'] },
    { name: 'left', keys: ['ArrowRight', 'KeyD'] },
    { name: 'right', keys: ['ArrowLeft', 'KeyA'] },
    { name: 'run', keys: ['ShiftLeft', 'ShiftRight'] },
  ], []);

  return (
    <div className={styles.container}>
      <KeyboardControls map={map}>
        <Canvas className={styles.canvas} shadows>
          
          {/* 3. The Logger needs access to the controls */}
          <CameraLogger controlsRef={controlsRef} />

          <PerspectiveCamera 
            makeDefault 
            position={CONFIG.CAMERA.position} 
            fov={CONFIG.CAMERA.fov}
            near={0.1} 
            far={100} 
          />
          
          <OrbitControls 
            ref={controlsRef} // Attach ref here
            target={CONFIG.CAMERA.target} 
            makeDefault
            enablePan={true} 
            minPolarAngle={Math.PI / 4} 
            maxPolarAngle={Math.PI / 2} 
          />

          <ambientLight intensity={0.8} />
          <directionalLight 
    position={[5, 10, 5]} 
    intensity={1.5} 
    castShadow 
    shadow-mapSize={[1024, 1024]} 
    shadow-bias={-0.0001}         
    shadow-normalBias={0.05}      
  />
          <Environment preset="city" />
          
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
            <planeGeometry args={[50, 50]} />
            <meshStandardMaterial color="#9a9a9a" />
          </mesh>
          
          <AvatarModel 
            position={CONFIG.AVATAR.position} 
            scale={CONFIG.AVATAR.scale} 
            controlsEnabled={controlsEnabled}
            onPositionUpdate={setAvatarPos}
            onRotationUpdate={setAvatarRotation}
          />
        </Canvas>
      </KeyboardControls>
      
      {/* Small hint for developer */}
      <div style={{ position: 'absolute', bottom: 20, left: 20, color: 'white', opacity: 0.5, fontSize: '12px' }}>
        Press <b>L</b> to log camera config | Use <b>WASD + Shift</b> to move
      </div>
    </div>
  );
}