
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
  const [power, setPower] = useState(0);
  const [activeProjectileId, setActiveProjectileId] = useState<string | null>(null);

  const { mouse, camera } = useThree();
  const cameraRef = useRef<THREE.PerspectiveCamera>(null!);
  const powerRef = useRef(0);
  
  // Default camera settings
  const defaultCamPos = useMemo(() => new THREE.Vector3(0, PLAYER_HEIGHT + 0.4, 6), []);
  const defaultLookAt = useMemo(() => new THREE.Vector3(0, PLAYER_HEIGHT + 0.4, -10), []);

  // Memoize tree positions
  const trees = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      position: [
        (Math.random() - 0.5) * 80, 
        0, 
        -Math.random() * 120 - 20
      ] as [number, number, number],
      scale: 0.8 + Math.random() * 0.5
    }));
  }, []);

  // Initialize camera position once
  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.position.copy(defaultCamPos);
      cameraRef.current.lookAt(defaultLookAt);
    }
  }, [defaultCamPos, defaultLookAt]);

  // Sync ref for access in fireProjectile during event callback if needed (though here we use it in useFrame mostly)
  useEffect(() => {
    powerRef.current = power;
  }, [power]);

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
    // Basic direction based on mouse position
    // We invert mouse X because pulling right should aim slightly left and vice versa
    const direction = new THREE.Vector3(
      -mouse.x * 12,  
      -mouse.y * 18, 
      -35            
    ).normalize();

    // Use current calculated power
    const velocity = direction.multiplyScalar(powerRef.current);
    const id = `stone-${Date.now()}`;

    const newProjectile: ProjectileData = {
      id,
      position: { x: 0, y: PLAYER_HEIGHT + 0.1, z: 0.8 },
      velocity: { x: velocity.x, y: velocity.y, z: velocity.z },
      createdAt: Date.now()
    };

    setProjectiles(prev => [...prev, newProjectile]);
    setActiveProjectileId(id);
    
    // Reset state
    setIsPulling(false);
    setPower(0);
    onPowerChange(0);
  };

  const handlePointerDown = () => {
    setIsPulling(true);
    setActiveProjectileId(null); // Return camera to player to start aiming
  };

  const handlePointerUp = () => {
    if (isPulling) {
      // Small threshold to prevent firing on tiny accidental clicks
      if (powerRef.current > 5) {
        fireProjectile();
      } else {
        setIsPulling(false);
        setPower(0);
        onPowerChange(0);
      }
    }
  };

  useFrame((state, delta) => {
    // 1. Update power based on mouse displacement from "neutral"
    if (isPulling) {
      // Calculate distance from center (0,0) of the screen
      // mouse.x/y is [-1, 1]
      const pullDist = Math.sqrt(mouse.x * mouse.x + mouse.y * mouse.y);
      // Map 0-0.8 pull to 0-MAX_POWER
      const normalizedPull = Math.min(pullDist / 0.8, 1.0);
      const newPower = normalizedPull * MAX_POWER;
      
      setPower(newPower);
      onPowerChange(normalizedPull);
    }

    // 2. Physics Calculation
    const now = Date.now();
    const nextProjectiles: ProjectileData[] = [];
    let hitOccurred = false;
    const hitIds: string[] = [];
    let currentActiveProjectile: ProjectileData | undefined = undefined;

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

      if (newPos.y < -1) continue; // Let it fall slightly below ground for better follow feel

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
          currentActiveProjectile = updatedP;
        }
      }
    }

    if (hitOccurred) {
      setTargets(prevT => prevT.map(t => hitIds.includes(t.id) ? { ...t, hit: true } : t));
      for (let i = 0; i < hitIds.length; i++) onHit();
    }

    if (nextProjectiles.length !== projectiles.length || nextProjectiles.length > 0) {
      setProjectiles(nextProjectiles);
    }

    // 3. Camera Logic
    const cam = cameraRef.current || camera;
    if (currentActiveProjectile) {
      const p = currentActiveProjectile.position;
      // Position camera slightly behind and above the stone
      const followOffset = new THREE.Vector3(p.x, p.y + 0.8, p.z + 4);
      cam.position.lerp(followOffset, 0.1);
      cam.lookAt(p.x, p.y, p.z);
    } else {
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
      <PerspectiveCamera ref={cameraRef} makeDefault fov={45} />
      
      <Sky sunPosition={[100, 20, 100]} turbidity={0.1} rayleigh={0.3} />
      <Stars radius={100} depth={50} count={1500} factor={4} saturation={0} fade speed={0} />
      
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color="#2d4a31" roughness={1} />
      </mesh>
      
      {trees.map((tree) => (
        <mesh key={tree.id} position={tree.position}>
          <cylinderGeometry args={[0.1 * tree.scale, 0.2 * tree.scale, 5 * tree.scale, 6]} />
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

      {/* Capture Plane for Pointer Events */}
      <mesh 
        position={[0, PLAYER_HEIGHT, 3]} 
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
