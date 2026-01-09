
import React, { useRef, useMemo } from 'react';
import { useFrame, ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';
import { PLAYER_HEIGHT, MAX_POWER } from '../constants';

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

interface SlingshotProps {
  isPulling: boolean;
  mouseRef: THREE.Vector2; // Live reference from useThree
  power: number;
}

const Slingshot: React.FC<SlingshotProps> = ({ isPulling, mouseRef, power }) => {
  const leftBandRef = useRef<THREE.Line>(null!);
  const rightBandRef = useRef<THREE.Line>(null!);
  const pouchRef = useRef<THREE.Group>(null!);

  const forkLeft = useMemo(() => new THREE.Vector3(-0.35, PLAYER_HEIGHT + 0.1, 1), []);
  const forkRight = useMemo(() => new THREE.Vector3(0.35, PLAYER_HEIGHT + 0.1, 1), []);

  useFrame(() => {
    // We read from mouseRef directly here, so it's always up to date 
    // without needing parent re-renders.
    const stretchX = isPulling ? mouseRef.x * 0.8 : 0;
    const stretchY = isPulling ? mouseRef.y * 0.8 : 0;
    
    // Z stretch depends directly on power
    const stretchZ = isPulling ? (power / MAX_POWER) * 2.0 : 0;

    const pouchTarget = new THREE.Vector3(
      stretchX,
      PLAYER_HEIGHT + 0.1 + stretchY,
      1 + stretchZ
    );

    // Smooth movement for the visual representation
    pouchRef.current.position.lerp(pouchTarget, 0.3);
    const pouchPos = pouchRef.current.position;

    // Update Band Geometries
    leftBandRef.current.geometry.setFromPoints([forkLeft, pouchPos]);
    rightBandRef.current.geometry.setFromPoints([forkRight, pouchPos]);
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
        {isPulling && (
          <mesh position={[0, 0, -3]}>
             <ringGeometry args={[0.1, 0.12, 32]} />
             <meshBasicMaterial color="yellow" transparent opacity={0.4} />
          </mesh>
        )}
      </group>
    </group>
  );
};

export default Slingshot;
