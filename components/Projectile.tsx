
import React from 'react';
import { ThreeElements } from '@react-three/fiber';
import { Vector3 } from '../types';

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
      <sphereGeometry args={[0.35, 32, 32]} />
      <meshStandardMaterial 
        color="#FFFFFF" 
        emissive="#FFFFFF" 
        emissiveIntensity={2.0} 
        roughness={0}
      />
    </mesh>
  );
};

export default Projectile;
