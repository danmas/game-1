
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

  const { mouse } = useThree();
  const isSpaceDownRef = useRef(false);
  const powerRef = useRef(0);
  const isPullingRef = useRef(false);

  // Sync refs for event listeners to avoid stale closures without dependency thrashing
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
    // Current direction based on mouse position
    // Pull UP (mouse.y > 0) -> Fire DOWN (direction.y < 0)
    // Pull LEFT (mouse.x < 0) -> Fire RIGHT (direction.x > 0)
    const direction = new THREE.Vector3(
      -mouse.x * 8,  
      -mouse.y * 14, 
      -25            
    ).normalize();

    const velocity = direction.multiplyScalar(powerRef.current);

    const newProjectile: ProjectileData = {
      id: `stone-${Date.now()}`,
      position: { x: 0, y: PLAYER_HEIGHT, z: 0.5 },
      velocity: { x: velocity.x, y: velocity.y, z: velocity.z },
      createdAt: Date.now()
    };

    setProjectiles(prev => [...prev, newProjectile]);
    
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
  }, []); // Empty deps - we use refs inside fireProjectile

  const handlePointerDown = () => {
    setIsPulling(true);
    setPower(MAX_POWER * BASE_POWER_FACTOR);
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
    // Update power based on spacebar hold
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

    // Physics
    setProjectiles(prev => {
      if (prev.length === 0) return prev;
      
      const now = Date.now();
      const nextProjectiles: ProjectileData[] = [];
      let hitOccurred = false;
      const hitIds: string[] = [];

      for (const p of prev) {
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
          nextProjectiles.push({ ...p, position: newPos, velocity: newVel });
        }
      }

      if (hitOccurred) {
        setTargets(prevT => prevT.map(t => hitIds.includes(t.id) ? { ...t, hit: true } : t));
        for (let i = 0; i < hitIds.length; i++) onHit();
      }

      return nextProjectiles;
    });
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, PLAYER_HEIGHT + 0.4, 6]} fov={45} />
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
