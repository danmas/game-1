import React, { useRef, useMemo } from 'react';
import { useFrame, ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';
import { PLAYER_HEIGHT } from '../constants';

// Add type augmentation to support Three.js elements in JSX
declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

interface SlingshotProps {
  isPulling: boolean;
  pullVector: THREE.Vector3;
  power: number;
}

const Slingshot: React.FC<SlingshotProps> = ({ isPulling, pullVector, power }) => {
  const leftBandRef = useRef<THREE.Line>(null!);
  const rightBandRef = useRef<THREE.Line>(null!);
  const pouchRef = useRef<THREE.Group>(null!);

  const basePos = useMemo(() => new THREE.Vector3(0, PLAYER_HEIGHT - 0.4, 1), []);
  const forkLeft = useMemo(() => new THREE.Vector3(-0.3, PLAYER_HEIGHT, 1), []);
  const forkRight = useMemo(() => new THREE.Vector3(0.3, PLAYER_HEIGHT, 1), []);

  useFrame(() => {
    // Current "pull point"
    // pullVector.x/y is normalized -1 to 1.
    // We map this to a local offset for the pouch
    const stretchX = isPulling ? pullVector.x * 0.5 : 0;
    const stretchY = isPulling ? pullVector.y * 0.5 : 0;
    const stretchZ = isPulling ? (power / 60) * 1.5 : 0; // Pull backwards

    const pouchTarget = new THREE.Vector3(
      stretchX,
      PLAYER_HEIGHT + stretchY,
      1 + stretchZ
    );

    pouchRef.current.position.lerp(pouchTarget, 0.2);

    const pouchPos = pouchRef.current.position;

    // Update Band Geometries
    const leftPoints = [forkLeft, pouchPos];
    leftBandRef.current.geometry.setFromPoints(leftPoints);

    const rightPoints = [forkRight, pouchPos];
    rightBandRef.current.geometry.setFromPoints(rightPoints);
  });

  return (
    <group>
      {/* Slingshot Handle & Fork */}
      <group position={[0, PLAYER_HEIGHT - 0.4, 1]}>
        {/* Handle */}
        <mesh position={[0, -0.3, 0]}>
          <boxGeometry args={[0.08, 0.6, 0.08]} />
          <meshStandardMaterial color="#5d4037" roughness={1} />
        </mesh>
        {/* Fork Bridge */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.6, 0.08, 0.08]} />
          <meshStandardMaterial color="#5d4037" roughness={1} />
        </mesh>
        {/* Left Tip */}
        <mesh position={[-0.3, 0.2, 0]}>
          <boxGeometry args={[0.08, 0.4, 0.08]} />
          <meshStandardMaterial color="#5d4037" roughness={1} />
        </mesh>
        {/* Right Tip */}
        <mesh position={[0.3, 0.2, 0]}>
          <boxGeometry args={[0.08, 0.4, 0.08]} />
          <meshStandardMaterial color="#5d4037" roughness={1} />
        </mesh>
      </group>

      {/* Rubber Bands */}
      <line ref={leftBandRef}>
        <bufferGeometry />
        <lineBasicMaterial color="#e91e63" linewidth={2} />
      </line>
      <line ref={rightBandRef}>
        <bufferGeometry />
        <lineBasicMaterial color="#e91e63" linewidth={2} />
      </line>

      {/* Pouch / Stone Holder */}
      <group ref={pouchRef}>
        <mesh>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color="#333" />
        </mesh>
        {/* Aim indicator if pulling */}
        {isPulling && (
          <mesh position={[0, 0, -2]}>
             <sphereGeometry args={[0.02, 4, 4]} />
             <meshBasicMaterial color="yellow" transparent opacity={0.5} />
          </mesh>
        )}
      </group>
    </group>
  );
};

export default Slingshot;