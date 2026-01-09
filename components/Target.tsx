import React, { useRef } from 'react';
import { useFrame, ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';
import { Vector3 } from '../types';

// Add type augmentation to support Three.js elements in JSX
declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

interface TargetProps {
  position: Vector3;
}

const Target: React.FC<TargetProps> = ({ position }) => {
  const meshRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    // Gentle floating animation
    meshRef.current.position.y = position.y + Math.sin(state.clock.elapsedTime + position.z) * 0.2;
    meshRef.current.rotation.y += 0.01;
  });

  return (
    <group ref={meshRef} position={[position.x, position.y, position.z]}>
      {/* Outer Ring */}
      <mesh rotation={[0, 0, 0]}>
        <cylinderGeometry args={[1, 1, 0.1, 32]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color="white" />
      </mesh>
      {/* Red Ring */}
      <mesh position={[0, 0, 0.06]}>
        <cylinderGeometry args={[0.7, 0.7, 0.02, 32]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color="red" />
      </mesh>
      {/* Bullseye */}
      <mesh position={[0, 0, 0.08]}>
        <cylinderGeometry args={[0.3, 0.3, 0.02, 32]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color="red" />
      </mesh>
      {/* Stand/Pole */}
      <mesh position={[0, -5, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 10, 8]} />
        <meshStandardMaterial color="#444" />
      </mesh>
    </group>
  );
};

export default Target;