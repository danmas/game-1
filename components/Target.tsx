
import React, { useRef } from 'react';
import { useFrame, ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';
import { Vector3 } from '../types';

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
    // Парение мишени
    meshRef.current.position.y = position.y + Math.sin(state.clock.elapsedTime * 2.5 + position.z) * 0.4;
    meshRef.current.rotation.y += 0.03;
  });

  return (
    <group ref={meshRef} position={[position.x, position.y, position.z]}>
      {/* Основа мишени */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[1.5, 1.5, 0.2, 32]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      
      {/* Красные круги */}
      <mesh position={[0, 0, 0.11]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.0, 1.0, 0.05, 32]} />
        <meshStandardMaterial color="#F44336" />
      </mesh>
      <mesh position={[0, 0, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.05, 32]} />
        <meshStandardMaterial color="#F44336" />
      </mesh>
      
      {/* Столб */}
      <mesh position={[0, -position.y - 1, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 12, 8]} />
        <meshStandardMaterial color="#424242" />
      </mesh>
    </group>
  );
};

export default Target;
