
import React, { useRef, useMemo } from 'react';
import { useFrame, ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';
import { MAX_POWER } from '../constants';

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

interface SlingshotProps {
  isPulling: boolean;
  mouseRef: THREE.Vector2;
  powerRef: React.MutableRefObject<number>;
}

const Slingshot: React.FC<SlingshotProps> = ({ isPulling, mouseRef, powerRef }) => {
  const leftBandRef = useRef<THREE.Line>(null!);
  const rightBandRef = useRef<THREE.Line>(null!);
  const pouchRef = useRef<THREE.Group>(null!);
  const arrowRef = useRef<THREE.Group>(null!);
  const arrowShaftRef = useRef<THREE.Mesh>(null!);
  const arrowMaterialRef = useRef<THREE.MeshStandardMaterial>(null!);

  const forkLeft = useMemo(() => new THREE.Vector3(-0.45, 0.3, 0), []);
  const forkRight = useMemo(() => new THREE.Vector3(0.45, 0.3, 0), []);

  useFrame(() => {
    const power = powerRef.current;
    const tension = power / MAX_POWER;

    // Elastic visualization
    const stretchX = isPulling ? mouseRef.x * 0.5 : 0;
    const stretchY = isPulling ? mouseRef.y * 0.6 : 0;
    const stretchZ = isPulling ? tension * 2.5 : 0;

    const pouchTarget = new THREE.Vector3(stretchX, 0.3 + stretchY, stretchZ);
    pouchRef.current.position.lerp(pouchTarget, 0.3);
    const pouchPos = pouchRef.current.position;

    leftBandRef.current.geometry.setFromPoints([forkLeft, pouchPos]);
    rightBandRef.current.geometry.setFromPoints([forkRight, pouchPos]);

    // Aiming Arrow
    if (isPulling && power > 2) {
      arrowRef.current.visible = true;
      const pitch = -mouseRef.y * 0.85;
      arrowRef.current.rotation.x = pitch;

      const scale = tension * 7 + 1.5;
      arrowShaftRef.current.scale.y = scale;
      arrowShaftRef.current.position.z = -scale / 2;
      
      const color = new THREE.Color().setHSL(0.35 * (1 - tension), 1, 0.6);
      if (arrowMaterialRef.current) {
        arrowMaterialRef.current.color.copy(color);
        arrowMaterialRef.current.emissive.copy(color).multiplyScalar(1.2);
      }
    } else {
      arrowRef.current.visible = false;
    }
  });

  return (
    <group>
      {/* Wooden Slingshot Frame */}
      <group position={[0, -0.6, 0]}>
        <mesh position={[0, -0.4, 0]} castShadow>
          <boxGeometry args={[0.18, 1.2, 0.18]} />
          <meshStandardMaterial color="#4e342e" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.2, 0]} castShadow>
          <boxGeometry args={[0.9, 0.18, 0.18]} />
          <meshStandardMaterial color="#4e342e" roughness={0.9} />
        </mesh>
        <mesh position={[-0.45, 0.5, 0]} castShadow>
          <boxGeometry args={[0.18, 0.8, 0.18]} />
          <meshStandardMaterial color="#4e342e" roughness={0.9} />
        </mesh>
        <mesh position={[0.45, 0.5, 0]} castShadow>
          <boxGeometry args={[0.18, 0.8, 0.18]} />
          <meshStandardMaterial color="#4e342e" roughness={0.9} />
        </mesh>
      </group>

      {/* Target Preview Arrow */}
      <group ref={arrowRef} position={[0, 0.3, 0]} visible={false}>
        <mesh ref={arrowShaftRef} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 1, 8]} />
          <meshStandardMaterial ref={arrowMaterialRef} transparent opacity={0.8} emissiveIntensity={2} />
        </mesh>
      </group>

      {/* Elastic Bands */}
      <line ref={leftBandRef as any}>
        <bufferGeometry />
        <lineBasicMaterial color="#d32f2f" linewidth={5} />
      </line>
      <line ref={rightBandRef as any}>
        <bufferGeometry />
        <lineBasicMaterial color="#d32f2f" linewidth={5} />
      </line>

      {/* Pouch */}
      <group ref={pouchRef}>
        <mesh castShadow>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#333" roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
};

export default Slingshot;
