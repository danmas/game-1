import React, { Suspense, useState, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree, ThreeElements } from '@react-three/fiber';
import { Sky, ContactShadows, Environment, Float, PerspectiveCamera, Stars } from '@react-three/drei';
import * as THREE from 'three';
import Slingshot from './Slingshot';
import Target from './Target';
import Projectile from './Projectile';
import { TargetData, ProjectileData, GameState } from '../types';
import { TARGET_COUNT, PLAYER_HEIGHT, GRAVITY, MAX_POWER, POWER_CHARGE_RATE, PROJECTILE_LIFETIME } from '../constants';

// Add type augmentation to support Three.js elements in JSX
declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

interface GameProps {
  onHit: () => void;
}

const Scene: React.FC<GameProps> = ({ onHit }) => {
  const [targets, setTargets] = useState<TargetData[]>([]);
  const [projectiles, setProjectiles] = useState<ProjectileData[]>([]);
  const [isPulling, setIsPulling] = useState(false);
  const [pullStartTime, setPullStartTime] = useState(0);
  const [power, setPower] = useState(0);

  const { viewport, mouse } = useThree();

  // Initialize targets once
  useEffect(() => {
    const newTargets: TargetData[] = [];
    for (let i = 0; i < TARGET_COUNT; i++) {
      newTargets.push({
        id: `target-${i}`,
        position: {
          x: (Math.random() - 0.5) * 15, // Немного сузим разброс для удобства
          y: 1.0 + Math.random() * 2.5,
          z: -25 - (i * 15) - Math.random() * 10 // Разные дистанции
        },
        hit: false
      });
    }
    setTargets(newTargets);
  }, []);

  const handlePointerDown = (e: any) => {
    setIsPulling(true);
    setPullStartTime(Date.now());
    setPower(0);
  };

  const handlePointerUp = (e: any) => {
    if (!isPulling) return;
    
    setIsPulling(false);
    
    // Calculate final power based on duration
    const duration = (Date.now() - pullStartTime) / 1000;
    const finalPower = Math.min(duration * POWER_CHARGE_RATE, MAX_POWER);

    if (finalPower < 5) return; // Защита от случайных кликов

    // Aiming calculation:
    // mouse.x is -1 to 1.
    // mouse.y is -1 to 1.
    // Инвертируем X: тянем мышку вправо (mouse.x > 0) -> летит влево
    // Инвертируем Y: тянем мышку вверх (mouse.y > 0) -> летит вниз
    
    const direction = new THREE.Vector3(
      -mouse.x * 6,         // Инверсия по горизонтали
      -mouse.y * 12,        // Инверсия по вертикали
      -20                   // Базовая скорость вперед
    ).normalize();

    const velocity = direction.multiplyScalar(finalPower);

    const newProjectile: ProjectileData = {
      id: `stone-${Date.now()}`,
      position: { x: 0, y: PLAYER_HEIGHT, z: 0.5 },
      velocity: { x: velocity.x, y: velocity.y, z: velocity.z },
      createdAt: Date.now()
    };

    setProjectiles(prev => [...prev, newProjectile]);
  };

  useFrame((state, delta) => {
    if (isPulling) {
      const duration = (Date.now() - pullStartTime) / 1000;
      setPower(Math.min(duration * POWER_CHARGE_RATE, MAX_POWER));
    }

    // Physics for projectiles
    setProjectiles(prev => {
      const now = Date.now();
      return prev
        .filter(p => now - p.createdAt < PROJECTILE_LIFETIME)
        .map(p => {
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

          // Ground collision
          if (newPos.y < -0.1) {
              return null as any;
          }

          // Target collision check
          let hitAny = false;
          setTargets(prevTargets => {
            return prevTargets.map(t => {
              if (t.hit) return t;
              const dx = newPos.x - t.position.x;
              const dy = newPos.y - t.position.y;
              const dz = newPos.z - t.position.z;
              const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
              if (dist < 0.8) { // Радиус попадания
                onHit();
                hitAny = true;
                return { ...t, hit: true };
              }
              return t;
            });
          });

          if (hitAny) return null as any; // Снаряд исчезает при попадании

          return { ...p, position: newPos, velocity: newVel };
        })
        .filter(Boolean);
    });
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, PLAYER_HEIGHT + 0.5, 6]} fov={45} />
      <Sky sunPosition={[100, 20, 100]} turbidity={0.1} rayleigh={0.5} />
      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
      <ambientLight intensity={0.7} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <directionalLight position={[0, 20, 10]} intensity={1.5} castShadow />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color="#3a5a40" roughness={1} />
      </mesh>
      
      {/* Trees/Poles for atmosphere */}
      {Array.from({ length: 40 }).map((_, i) => (
        <mesh key={i} position={[(Math.random() - 0.5) * 80, 0, -Math.random() * 150 - 20]}>
          <cylinderGeometry args={[0.2, 0.4, 4, 8]} />
          <meshStandardMaterial color="#2d1b0d" />
        </mesh>
      ))}

      {/* Slingshot Visual */}
      <Slingshot 
        isPulling={isPulling} 
        pullVector={new THREE.Vector3(mouse.x, mouse.y, 0)} 
        power={power} 
      />

      {/* Targets */}
      {targets.map(t => !t.hit && (
        <Target key={t.id} position={t.position} />
      ))}

      {/* Projectiles */}
      {projectiles.map(p => (
        <Projectile key={p.id} position={p.position} />
      ))}

      {/* Capture Plane (Transparent background for interaction) */}
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

const Game: React.FC<GameProps> = ({ onHit }) => {
  return (
    <div className="w-full h-full">
      <Canvas shadows dpr={[1, 2]}>
        <Suspense fallback={null}>
          <Scene onHit={onHit} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Game;