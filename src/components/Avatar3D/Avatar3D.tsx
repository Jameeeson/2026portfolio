'use client';

import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, KeyboardControls, Sky, Cloud } from '@react-three/drei';
import { useEffect, useRef, useMemo, useState, Suspense, useCallback } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Vector3, Raycaster, Plane } from 'three';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import styles from './Avatar3D.module.css';
import AvatarModel from './AvatarModel';
import Building from './Building';

// --- 1. CONFIGURATION ---
const CONFIG = {
  AVATAR: {
    position: [0, 1.8, 0] as [number, number, number],
    scale: 1
  },
  CAMERA: {
    position: [-0.0119, 1.55, 1.314] as [number, number, number],
    target: [-0.06, 1.5, -0.093] as [number, number, number],
    fov: 50
  }
};

const map = [
  { name: 'forward', keys: ['ArrowDown', 'KeyS'] },
  { name: 'backward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'left', keys: ['ArrowRight', 'KeyD'] },
  { name: 'right', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'run', keys: ['ShiftLeft', 'ShiftRight'] },
];

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

// --- 3. HELPER COMPONENT: SMOOTH CAMERA FOLLOW ---
const CameraHandler = ({ 
  avatarPos, 
  avatarRotation, 
  controlsEnabled 
}: { 
  avatarPos: [number, number, number], 
  avatarRotation: number,
  controlsEnabled: boolean
}) => {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  
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

  // Set initial target
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.target.set(
        avatarPos[0] + initialOffset.target.x,
        avatarPos[1] + initialOffset.target.y,
        avatarPos[2] + initialOffset.target.z
      );
    }
  }, []);

  useFrame((state, delta) => {
    if (!controlsRef.current) return;

    const targetPos = new Vector3(avatarPos[0], avatarPos[1], avatarPos[2]);
    
    // When not controlling (chat mode), snap camera to front of avatar
    if (!controlsEnabled) {
      const rotatedPosOffset = initialOffset.pos.clone().applyAxisAngle(new Vector3(0, 1, 0), avatarRotation);
      const rotatedTargetOffset = initialOffset.target.clone().applyAxisAngle(new Vector3(0, 1, 0), avatarRotation);
      
      const desiredPos = targetPos.clone().add(rotatedPosOffset);
      const desiredTarget = targetPos.clone().add(rotatedTargetOffset);
      
      camera.position.lerp(desiredPos, 0.1);
      controlsRef.current.target.lerp(desiredTarget, 0.1);
    } else {
      // When walking, follow the character's position but keep the orbit rotation
      // Only interpolate the target (where the camera looks)
      const desiredTarget = targetPos.clone().add(new Vector3(0, 1.2, 0)); // Look at avatar chest/head
      controlsRef.current.target.lerp(desiredTarget, 0.1);
      
      // We don't force camera.position here to allow the user to drag freely
    }
    
    controlsRef.current.update();
  });

  return (
    <>
      <CameraLogger controlsRef={controlsRef} />
      <OrbitControls 
        ref={controlsRef}
        makeDefault
        enablePan={false}
        enableDamping={true}
        dampingFactor={0.05}
        minDistance={1}
        maxDistance={15}
        minPolarAngle={0} 
        maxPolarAngle={Math.PI / 1.75}
        touches={{
          ONE: 2, // TOUCH.ROTATE
          TWO: 1  // TOUCH.DOLLY_PAN
        }}
        enableZoom={true}
        zoomSpeed={0.8}
        rotateSpeed={0.5}
      />
    </>
  );
};

type Avatar3DProps = {
  controlsEnabled?: boolean;
};

export default function Avatar3D({ controlsEnabled = false }: Avatar3DProps) {
  const [avatarPos, setAvatarPos] = useState<[number, number, number]>(CONFIG.AVATAR.position);
  const [avatarRotation, setAvatarRotation] = useState<number>(0);
  const [isMobile, setIsMobile] = useState(false);
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickDirection, setJoystickDirection] = useState({ x: 0, y: 0 });
  const joystickRef = useRef<HTMLDivElement>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Virtual joystick handlers for mobile
  const handleJoystickStart = useCallback((e: React.TouchEvent) => {
    if (!controlsEnabled) return;
    e.stopPropagation();
    setJoystickActive(true);
  }, [controlsEnabled]);

  const handleJoystickMove = useCallback((e: React.TouchEvent) => {
    if (!joystickActive || !joystickRef.current) return;
    e.stopPropagation();
    
    const touch = e.touches[0];
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = touch.clientX - centerX;
    const deltaY = touch.clientY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = rect.width / 2;
    
    const normalizedX = Math.max(-1, Math.min(1, deltaX / maxDistance));
    const normalizedY = Math.max(-1, Math.min(1, deltaY / maxDistance));
    
    setJoystickDirection({ x: normalizedX, y: normalizedY });
  }, [joystickActive]);

  const handleJoystickEnd = useCallback(() => {
    setJoystickActive(false);
    setJoystickDirection({ x: 0, y: 0 });
  }, []);

  return (
    <div className={styles.container}>
      <KeyboardControls map={map}>
        <Canvas className={styles.canvas} shadows>
          
          <CameraHandler 
            avatarPos={avatarPos} 
            avatarRotation={avatarRotation} 
            controlsEnabled={controlsEnabled} 
          />

          <PerspectiveCamera 
            makeDefault 
            position={CONFIG.CAMERA.position} 
            fov={CONFIG.CAMERA.fov}
            near={0.1} 
            far={100} 
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
          
          {/* SKY AND CLOUDS */}
          <Sky 
            distance={450000}
            sunPosition={[100, 20, 100]}
            inclination={0.6}
            azimuth={0.25}
          />
          
          {/* Scattered clouds */}
          <Cloud position={[-4, 10, -25]} speed={0.2} opacity={0.5} />
          <Cloud position={[10, 8, -15]} speed={0.3} opacity={0.4} />
          <Cloud position={[-15, 12, -30]} speed={0.15} opacity={0.6} />
          <Cloud position={[20, 9, -20]} speed={0.25} opacity={0.45} />
          <Cloud position={[-8, 11, -10]} speed={0.18} opacity={0.5} />
          
          <Suspense fallback={null}>
            <Physics debug={false}>
              {/* BUILDINGS SECTION */}
              <Building path="/buildings/tiny_home.glb" position={[-7, 0, -20]} />
              
              <RigidBody type="fixed" colliders={false} friction={1}>
                {/* 
                   THICKER COLLIDER: 
                   Height is 2 (half-extent 1). Position y=-1 places top at 0.
                */}
                <CuboidCollider args={[50, 1, 50]} position={[0, -1, 0]} />
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                  <planeGeometry args={[100, 100]} />
                  <meshStandardMaterial color="#313131" />
                </mesh>
              </RigidBody>
              
              <AvatarModel 
                position={CONFIG.AVATAR.position} 
                scale={CONFIG.AVATAR.scale} 
                controlsEnabled={controlsEnabled}
                onPositionUpdate={setAvatarPos}
                onRotationUpdate={setAvatarRotation}
                joystickInput={joystickDirection}
              />
            </Physics>
          </Suspense>
        </Canvas>
      </KeyboardControls>
      
      {/* Controls UI */}
      {!isMobile ? (
        <div className={styles.controlsHint}>
          <div><b>WASD</b> or Arrow Keys to move</div>
          <div>Hold <b>Shift</b> to run</div>
          <div> Drag to rotate camera</div>
          <div> Scroll to zoom</div>
        </div>
      ) : controlsEnabled ? (
        <div 
          ref={joystickRef}
          className={styles.joystick}
          onTouchStart={handleJoystickStart}
          onTouchMove={handleJoystickMove}
          onTouchEnd={handleJoystickEnd}
        >
          <div 
            className={styles.joystickKnob}
            style={{
              transform: `translate(${joystickDirection.x * 40}px, ${joystickDirection.y * 40}px)`,
              opacity: joystickActive ? 1 : 0.6
            }}
          />
        </div>
      ) : (
        <div className={styles.touchHint}>
           Tap to chat • Pinch to zoom • Drag to rotate
        </div>
      )}
    </div>
  );
}