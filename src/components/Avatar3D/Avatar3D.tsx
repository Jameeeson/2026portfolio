'use client';

import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
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

export default function Avatar3D() {
  // We need a ref to access the OrbitControls internal target
  const controlsRef = useRef<OrbitControlsImpl>(null);

  return (
    <div className={styles.container}>
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
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#473e3eff" />
        </mesh>
        
        <AvatarModel 
          position={CONFIG.AVATAR.position} 
          scale={CONFIG.AVATAR.scale} 
        />
      </Canvas>
      
      {/* Small hint for developer */}
      <div style={{ position: 'absolute', bottom: 20, left: 20, color: 'white', opacity: 0.5, fontSize: '12px' }}>
        Press <b>L</b> to log camera config
      </div>
    </div>
  );
}