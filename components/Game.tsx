
import React, { Suspense, useState, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree, ThreeElements } from '@react-three/fiber';
import { Sky, PerspectiveCamera, Stars } from '@react-three/drei';
import * as THREE from 'three';
import Slingshot from './Slingshot';
import Target from './Target';
import Projectile from './Projectile';
import { TargetData, ProjectileData } from '../types';
import { 
  TARGET_COUNT, 
  PLAYER_HEIGHT, 
  GRAVITY, 
  MAX_POWER, 
  BASE_POWER_FACTOR, 
  CHARGE_TIME_MS, 
  PROJECTILE_LIFETIME 
} from '../constants';

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
  namespace React {
    namespace JSX {
      interface IntrinsicElements extends ThreeElements {}
    }
  }
}

interface GameProps {
  onHit: () => void;
  onPowerChange: (power: number) => void;
}

const Scene: React.FC<GameProps> = ({ onHit, onPowerChange }) => {
  const [targets, setTargets] = useState<TargetData[]>([]);
  const [projectiles, setProjectiles] = useState<ProjectileData[]>([]);
  const [isPulling, setIsPulling] = useState(false);
  const [spacePressedStartTime, setSpacePressedStartTime] = useState<number | null>(null);
  const [power, setPower] = useState(0);
  const [activeProjectileId, setActiveProjectileId] = useState<string | null>(null);

  const { mouse, camera } = useThree();
  const cameraRef = useRef<THREE.PerspectiveCamera>(null!);
  const isSpaceDownRef = useRef(false);
  const powerRef = useRef(0);
  const isPullingRef = useRef(false);
  
  // Default camera settings
  const defaultCamPos = useMemo(() => new THREE.Vector3(0, PLAYER_HEIGHT + 0.4, 6), []);
  const defaultLookAt = useMemo(() => new THREE.Vector3(0, PLAYER_HEIGHT + 0.4, -10), []);

  // Initialize camera position once
  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.position.copy(defaultCamPos);
      cameraRef.current.lookAt(defaultLookAt);
    }
  }, [defaultCamPos, defaultLookAt]);

  // Sync refs for event listeners
  useEffect(() => {
    powerRef.current = power;
    isPullingRef.current = isPulling;
  }, [power, isPulling]);

  // Initialize targets
  useEffect(() => {
    const newTargets: TargetData[] = [];
    for (let i = 0; i < TARGET_COUNT; i++) {
      newTargets.push({
        id: `target-${i}`,
        position: {
          x: (Math.random() - 0.5) * 12,
          y: 1.2 + Math.random() * 2,
          z: -20 - (i * 15) - Math.random() * 5
        },
        hit: false
      });
    }
    setTargets(newTargets);
  }, []);

  const fireProjectile = () => {
    const direction = new THREE.Vector3(
      -mouse.x * 8,  
      -mouse.y * 14, 
      -25            
    ).normalize();

    const velocity = direction.multiplyScalar(powerRef.current);
    const id = `stone-${Date.now()}`;

    const newProjectile: ProjectileData = {
      id,
      position: { x: 0, y: PLAYER_HEIGHT, z: 0.5 },
      velocity: { x: velocity.x, y: velocity.y, z: velocity.z },
      createdAt: Date.now()
    };

    setProjectiles(prev => [...prev, newProjectile]);
    setActiveProjectileId(id);
    
    // Reset state
    setIsPulling(false);
    setPower(0);
    onPowerChange(0);
    setSpacePressedStartTime(null);
  };

  // Keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpaceDownRef.current && isPullingRef.current) {
        isSpaceDownRef.current = true;
        setSpacePressedStartTime(Date.now());
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isSpaceDownRef.current) {
        isSpaceDownRef.current = false;
        if (isPullingRef.current) {
          fireProjectile();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handlePointerDown = () => {
    setIsPulling(true);
    setPower(MAX_POWER * BASE_POWER_FACTOR);
    setActiveProjectileId(null); 
  };

  const handlePointerUp = () => {
    if (!isSpaceDownRef.current) {
      setIsPulling(false);
      setPower(0);
      onPowerChange(0);
      setSpacePressedStartTime(null);
    }
  };

  useFrame((state, delta) => {
    // 1. Update power
    if (isPulling) {
      if (isSpaceDownRef.current && spacePressedStartTime !== null) {
        const elapsed = Date.now() - spacePressedStartTime;
        const chargeProgress = Math.min(elapsed / CHARGE_TIME_MS, 1);
        const calculatedPower = MAX_POWER * BASE_POWER_FACTOR + (MAX_POWER * (1 - BASE_POWER_FACTOR) * chargeProgress);
        setPower(calculatedPower);
        onPowerChange(calculatedPower / MAX_POWER);
      } else {
        setPower(MAX_POWER * BASE_POWER_FACTOR);
        onPowerChange(BASE_POWER_FACTOR);
      }
    }

    // 2. Physics Calculation (done before state update to have current positions)
    const now = Date.now();
    const nextProjectiles: ProjectileData[] = [];
    let hitOccurred = false;
    const hitIds: string[] = [];
    let activeProjectile: ProjectileData | undefined = undefined;

    // Use a temp array to calculate next step
    for (const p of projectiles) {
      if (now - p.createdAt > PROJECTILE_LIFETIME) continue;

      const newPos = {
        x: p.position.x + p.velocity.x * delta,
        y: p.position.y + p.velocity.y * delta,
        z: p.position.z + p.velocity.z * delta
      };
      const newVel = {
        x: p.velocity.x,
        y: p.velocity.y - GRAVITY * delta,
        z: p.velocity.z
      };

      if (newPos.y < 0) continue;

      let currentProjectileHit = false;
      for (const t of targets) {
        if (t.hit) continue;
        const dx = newPos.x - t.position.x;
        const dy = newPos.y - t.position.y;
        const dz = newPos.z - t.position.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        
        if (distSq < 1.0) {
          hitOccurred = true;
          hitIds.push(t.id);
          currentProjectileHit = true;
          break; 
        }
      }

      if (!currentProjectileHit) {
        const updatedP = { ...p, position: newPos, velocity: newVel };
        nextProjectiles.push(updatedP);
        if (p.id === activeProjectileId) {
          activeProjectile = updatedP;
        }
      }
    }

    // Apply hits if any
    if (hitOccurred) {
      setTargets(prevT => prevT.map(t => hitIds.includes(t.id) ? { ...t, hit: true } : t));
      for (let i = 0; i < hitIds.length; i++) onHit();
    }

    // Update projectiles state
    if (nextProjectiles.length !== projectiles.length || nextProjectiles.length > 0) {
      setProjectiles(nextProjectiles);
    }

    // 3. Camera Logic (using calculated activeProjectile)
    const cam = cameraRef.current || camera;
    if (activeProjectile) {
      const p = activeProjectile.position;
      // Position camera slightly behind and above the stone
      const followOffset = new THREE.Vector3(p.x, p.y + 0.8, p.z + 4);
      cam.position.lerp(followOffset, 0.1);
      cam.lookAt(p.x, p.y, p.z);
    } else {
      // Smoothly return to base
      cam.position.lerp(defaultCamPos, 0.05);
      
      const currentLookAt = new THREE.Vector3();
      cam.getWorldDirection(currentLookAt);
      const targetLookAt = defaultLookAt.clone().sub(cam.position).normalize();
      const finalLookAt = currentLookAt.lerp(targetLookAt, 0.05);
      cam.lookAt(cam.position.clone().add(finalLookAt));
    }
  });

  return (
    <>
      {/* Remove position prop to allow manual control in useFrame */}
      <PerspectiveCamera ref={cameraRef} makeDefault fov={45} />
      
      <Sky sunPosition={[100, 20, 100]} turbidity={0.1} rayleigh={0.3} />
      <Stars radius={100} depth={50} count={1500} factor={4} saturation={0} fade speed={0} />
      
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color="#2d4a31" roughness={1} />
      </mesh>
      
      {Array.from({ length: 30 }).map((_, i) => (
        <mesh key={i} position={[(Math.random() - 0.5) * 60, 0, -Math.random() * 100 - 30]}>
          <cylinderGeometry args={[0.1, 0.2, 5, 6]} />
          <meshStandardMaterial color="#1b1108" />
        </mesh>
      ))}

      <Slingshot 
        isPulling={isPulling} 
        mouseRef={mouse} 
        power={power} 
      />

      {targets.map(t => !t.hit && <Target key={t.id} position={t.position} />)}
      {projectiles.map(p => (
        <Projectile key={p.id} position={p.position} />
      ))}

      {/* Capture Plane */}
      <mesh 
        position={[0, PLAYER_HEIGHT, 0]} 
        onPointerDown={handlePointerDown} 
        onPointerUp={handlePointerUp}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  );
};

const Game: React.FC<GameProps> = ({ onHit, onPowerChange }) => {
  return (
    <div className="w-full h-full bg-slate-900">
      <Canvas shadows dpr={[1, 1.5]}>
        <Suspense fallback={null}>
          <Scene onHit={onHit} onPowerChange={onPowerChange} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Game;
