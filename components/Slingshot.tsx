
import React, { useRef, useMemo } from 'react';
import { useFrame, ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';
import { PLAYER_HEIGHT, MAX_POWER } from '../constants';

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

interface SlingshotProps {
  isPulling: boolean;
  mouseRef: THREE.Vector2;
  power: number;
}

const Slingshot: React.FC<SlingshotProps> = ({ isPulling, mouseRef, power }) => {
  const leftBandRef = useRef<THREE.Line>(null!);
  const rightBandRef = useRef<THREE.Line>(null!);
  const pouchRef = useRef<THREE.Group>(null!);
  const arrowRef = useRef<THREE.Group>(null!);
  const arrowShaftRef = useRef<THREE.Mesh>(null!);
  const arrowHeadRef = useRef<THREE.Mesh>(null!);
  const arrowMaterialRef = useRef<THREE.MeshStandardMaterial>(null!);

  const forkLeft = useMemo(() => new THREE.Vector3(-0.35, PLAYER_HEIGHT + 0.1, 1), []);
  const forkRight = useMemo(() => new THREE.Vector3(0.35, PLAYER_HEIGHT + 0.1, 1), []);
  const forkCenter = useMemo(() => new THREE.Vector3(0, PLAYER_HEIGHT + 0.1, 1), []);

  useFrame(() => {
    // 1. Calculate Pull Visuals
    const stretchX = isPulling ? mouseRef.x * 0.8 : 0;
    const stretchY = isPulling ? mouseRef.y * 0.8 : 0;
    const stretchZ = isPulling ? (power / MAX_POWER) * 2.0 : 0;

    const pouchTarget = new THREE.Vector3(
      stretchX,
      PLAYER_HEIGHT + 0.1 + stretchY,
      1 + stretchZ
    );

    pouchRef.current.position.lerp(pouchTarget, 0.3);
    const pouchPos = pouchRef.current.position;

    leftBandRef.current.geometry.setFromPoints([forkLeft, pouchPos]);
    rightBandRef.current.geometry.setFromPoints([forkRight, pouchPos]);

    // 2. Aiming Arrow Logic
    if (isPulling && power > 5) {
      arrowRef.current.visible = true;
      
      // The direction math must match Game.tsx fireProjectile exactly
      const aimDir = new THREE.Vector3(
        -mouseRef.x * 12,
        -mouseRef.y * 18,
        -35
      ).normalize();

      // Update Arrow Rotation to match aim direction
      const quaternion = new THREE.Quaternion();
      const up = new THREE.Vector3(0, 1, 0);
      quaternion.setFromUnitVectors(up, aimDir);
      arrowRef.current.quaternion.slerp(quaternion, 0.2);

      // Scale arrow based on power
      const scaleFactor = (power / MAX_POWER) * 4;
      arrowShaftRef.current.scale.y = scaleFactor;
      arrowShaftRef.current.position.y = scaleFactor / 2;
      arrowHeadRef.current.position.y = scaleFactor;

      // Change color based on tension (Yellow -> Orange -> Red)
      const color = new THREE.Color().setHSL(0.15 * (1 - power / MAX_POWER), 1, 0.5);
      if (arrowMaterialRef.current) {
        arrowMaterialRef.current.color.copy(color);
        arrowMaterialRef.current.emissive.copy(color).multiplyScalar(0.5);
      }
    } else {
      arrowRef.current.visible = false;
    }
  });

  return (
    <group>
      {/* Wooden Frame */}
      <group position={[0, PLAYER_HEIGHT - 0.4, 1]}>
        <mesh position={[0, -0.3, 0]}>
          <boxGeometry args={[0.1, 0.7, 0.1]} />
          <meshStandardMaterial color="#4e342e" />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[0.7, 0.1, 0.1]} />
          <meshStandardMaterial color="#4e342e" />
        </mesh>
        <mesh position={[-0.35, 0.3, 0]}>
          <boxGeometry args={[0.1, 0.5, 0.1]} />
          <meshStandardMaterial color="#4e342e" />
        </mesh>
        <mesh position={[0.35, 0.3, 0]}>
          <boxGeometry args={[0.1, 0.5, 0.1]} />
          <meshStandardMaterial color="#4e342e" />
        </mesh>
      </group>

      {/* Aiming Arrow */}
      <group ref={arrowRef} position={[0, PLAYER_HEIGHT + 0.1, 1]} visible={false}>
        <mesh ref={arrowShaftRef}>
          <cylinderGeometry args={[0.02, 0.02, 1, 8]} />
          <meshStandardMaterial ref={arrowMaterialRef} transparent opacity={0.8} emissiveIntensity={1} />
        </mesh>
        <mesh ref={arrowHeadRef}>
          <coneGeometry args={[0.08, 0.2, 8]} />
          <meshStandardMaterial color="white" />
        </mesh>
      </group>

      {/* Rubber Bands */}
      <line ref={leftBandRef as any}>
        <bufferGeometry />
        <lineBasicMaterial color="#ff5252" linewidth={3} />
      </line>
      <line ref={rightBandRef as any}>
        <bufferGeometry />
        <lineBasicMaterial color="#ff5252" linewidth={3} />
      </line>

      {/* Pouch with Stone */}
      <group ref={pouchRef}>
        <mesh castShadow>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshStandardMaterial color="#424242" />
        </mesh>
      </group>
    </group>
  );
};

export default Slingshot;
