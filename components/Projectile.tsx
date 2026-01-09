import React from 'react';
import { ThreeElements } from '@react-three/fiber';
import { Vector3 } from '../types';

// Add type augmentation to support Three.js elements in JSX
declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

interface ProjectileProps {
  position: Vector3;
}

const Projectile: React.FC<ProjectileProps> = ({ position }) => {
  return (
    <mesh position={[position.x, position.y, position.z]} castShadow>
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshStandardMaterial color="#555" roughness={1} metalness={0.2} />
    </mesh>
  );
};

export default Projectile;