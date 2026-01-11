
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
}

interface GameProps {
  onHit: () => void;
  onPowerChange: (power: number) => void;
}

const Scene: React.FC<GameProps> = ({ onHit, onPowerChange }) => {
  const [targets, setTargets] = useState<TargetData[]>([]);
  const [projectiles, setProjectiles] = useState<ProjectileData[]>([]);
  const [isPulling, setIsPulling] = useState(false);
  const [activeProjectileId, setActiveProjectileId] = useState<string | null>(null);

  const { mouse } = useThree();
  const playerGroupRef = useRef<THREE.Group>(null!);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null!);
  
  const powerValueRef = useRef(0); 

  const trees = useMemo(() => {
    return Array.from({ length: 200 }).map((_, i) => ({
      id: i,
      position: [
        (Math.random() - 0.5) * 500, 
        0, 
        (Math.random() - 0.5) * 500 - 150
      ] as [number, number, number],
      scale: 1.5 + Math.random() * 3.0
    }));
  }, []);

  useEffect(() => {
    const newTargets: TargetData[] = [];
    for (let i = 0; i < TARGET_COUNT; i++) {
      newTargets.push({
        id: `target-${i}`,
        position: {
          x: (Math.random() - 0.5) * 150,
          y: 3 + Math.random() * 6,
          z: -80 - (i * 35) - Math.random() * 40
        },
        hit: false
      });
    }
    setTargets(newTargets);
  }, []);

  const fireProjectile = () => {
    const power = powerValueRef.current;
    if (power < 0.5) {
      setIsPulling(false);
      onPowerChange(0);
      return;
    }

    const yaw = playerGroupRef.current.rotation.y;
    // Pull down to shoot up
    const pitch = -mouse.y * 1.2; 

    const direction = new THREE.Vector3(0, Math.sin(pitch), -Math.cos(pitch));
    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    direction.normalize();

    const velocity = direction.multiplyScalar(power);
    const id = `projectile-${Date.now()}`;

    // Spawn relative to player group (which is at origin horizontally)
    const newProjectile: ProjectileData = {
      id,
      position: { x: 0, y: PLAYER_HEIGHT + 0.5, z: -0.1 },
      velocity: { x: velocity.x, y: velocity.y, z: velocity.z },
      createdAt: Date.now()
    };

    setProjectiles(prev => [...prev, newProjectile]);
    setActiveProjectileId(id);
    
    setIsPulling(false);
    onPowerChange(0);
    powerValueRef.current = 0;
  };

  useFrame((state, delta) => {
    // 1. Controls logic
    if (isPulling) {
      const pullDist = Math.sqrt(mouse.x * mouse.x + mouse.y * mouse.y);
      const normalizedPull = Math.min(pullDist / 0.4, 1.0);
      powerValueRef.current = normalizedPull * MAX_POWER;
      onPowerChange(normalizedPull);

      const targetYaw = mouse.x * 4.5; 
      playerGroupRef.current.rotation.y = THREE.MathUtils.lerp(playerGroupRef.current.rotation.y, targetYaw, 0.2);
    } else if (!activeProjectileId) {
      playerGroupRef.current.rotation.y = THREE.MathUtils.lerp(playerGroupRef.current.rotation.y, 0, 0.05);
    }

    // 2. Physics loop - CRITICAL: Only update state if there are projectiles to move
    if (projectiles.length > 0) {
      const now = Date.now();
      const nextProjectiles: ProjectileData[] = [];
      let hitOccurred = false;
      const hitIds: string[] = [];
      let currentActive: ProjectileData | undefined;

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

        // Collision with ground
        if (newPos.y < -0.1) continue;

        let hit = false;
        for (const t of targets) {
          if (t.hit) continue;
          const distSq = Math.pow(newPos.x - t.position.x, 2) + 
                         Math.pow(newPos.y - t.position.y, 2) + 
                         Math.pow(newPos.z - t.position.z, 2);
          
          if (distSq < 4.0) {
            hitOccurred = true;
            hitIds.push(t.id);
            hit = true;
            break;
          }
        }

        if (!hit) {
          const updated = { ...p, position: newPos, velocity: newVel };
          nextProjectiles.push(updated);
          if (p.id === activeProjectileId) currentActive = updated;
        }
      }

      if (hitOccurred) {
        setTargets(prev => prev.map(t => hitIds.includes(t.id) ? { ...t, hit: true } : t));
        hitIds.forEach(() => onHit());
      }
      
      // Update state only if it actually changed to avoid redundant renders and race conditions
      setProjectiles(nextProjectiles);
      
      // Camera following active projectile
      if (currentActive) {
        const p = currentActive.position;
        const followPos = new THREE.Vector3(p.x, p.y + 3, p.z + 12);
        state.camera.position.lerp(followPos, 0.2);
        state.camera.lookAt(p.x, p.y, p.z);
      }
    } else {
      // 3. Reset Camera when no projectiles are flying
      // To LOWER the horizon, we look HIGHER.
      cameraRef.current.position.lerp(new THREE.Vector3(0, 0.3, 7), 0.1);
      const lookAtPoint = new THREE.Vector3(0, 3.5, 0); // Pointing higher = lower horizon
      cameraRef.current.lookAt(lookAtPoint);
    }
  });

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    e.target.setPointerCapture(e.pointerId);
    setIsPulling(true);
    setActiveProjectileId(null);
  };

  const handlePointerUp = (e: any) => {
    e.stopPropagation();
    e.target.releasePointerCapture(e.pointerId);
    if (isPulling) {
      fireProjectile();
    }
  };

  return (
    <>
      <group ref={playerGroupRef} position={[0, PLAYER_HEIGHT, 0]}>
        <PerspectiveCamera ref={cameraRef} makeDefault fov={50} />
        <Slingshot isPulling={isPulling} mouseRef={mouse} powerRef={powerValueRef} />

        {/* Interaction Mesh */}
        <mesh 
          position={[0, 0, -4]} 
          onPointerDown={handlePointerDown} 
          onPointerUp={handlePointerUp}
        >
          <planeGeometry args={[200, 200]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
      </group>

      {/* Ultra Bright Environment */}
      <Sky sunPosition={[100, 150, 20]} turbidity={0} rayleigh={0.01} />
      <ambientLight intensity={1.8} />
      <directionalLight 
        position={[80, 100, 50]} 
        intensity={3.5} 
        castShadow 
        shadow-mapSize={[2048, 2048]}
      />

      {/* Vibrant Green Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4000, 4000]} />
        <meshStandardMaterial color="#27AE60" roughness={0.4} metalness={0.0} />
      </mesh>

      {/* Forest */}
      {trees.map(t => (
        <group key={t.id} position={t.position}>
          <mesh position={[0, 7 * t.scale, 0]} castShadow>
            <cylinderGeometry args={[0.3 * t.scale, 0.7 * t.scale, 14 * t.scale, 8]} />
            <meshStandardMaterial color="#341F1A" />
          </mesh>
          <mesh position={[0, 15 * t.scale, 0]} castShadow>
            <sphereGeometry args={[4 * t.scale, 10, 10]} />
            <meshStandardMaterial color="#0E6251" />
          </mesh>
        </group>
      ))}

      {/* Game Entities */}
      {targets.map(t => !t.hit && <Target key={t.id} position={t.position} />)}
      {projectiles.map(p => <Projectile key={p.id} position={p.position} />)}
    </>
  );
};

const Game: React.FC<GameProps> = (props) => {
  return (
    <div className="w-full h-full bg-[#D1F2EB]">
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}>
        <Suspense fallback={null}>
          <Scene {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Game;
