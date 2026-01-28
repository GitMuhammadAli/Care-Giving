'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Sage green color palette from the theme
const LEAF_COLORS = [
  '#8B9A7E', // sage-500
  '#6B7A5E', // sage-600
  '#525E48', // sage-700
  '#9AAA8D', // sage-400
  '#A8B5A0', // sage-light
];

// Terracotta accent (used sparingly)
const ACCENT_COLOR = '#996B4D';

interface LeafProps {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  color: string;
  speed: number;
  rotationSpeed: number;
  driftAmplitude: number;
  driftFrequency: number;
}

function Leaf({ position, rotation, scale, color, speed, rotationSpeed, driftAmplitude, driftFrequency }: LeafProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const initialY = position[1];
  const timeOffset = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    const time = state.clock.elapsedTime + timeOffset;
    
    // Gentle upward float
    meshRef.current.position.y = initialY + (time * speed) % 12 - 6;
    
    // Horizontal drift like wind
    meshRef.current.position.x = position[0] + Math.sin(time * driftFrequency) * driftAmplitude;
    
    // Gentle rotation
    meshRef.current.rotation.x = rotation[0] + Math.sin(time * rotationSpeed) * 0.3;
    meshRef.current.rotation.y = rotation[1] + time * rotationSpeed * 0.5;
    meshRef.current.rotation.z = rotation[2] + Math.cos(time * rotationSpeed * 0.7) * 0.2;
  });

  // Simple leaf shape geometry
  const leafShape = useMemo(() => {
    const shape = new THREE.Shape();
    
    // Create a simple leaf outline
    shape.moveTo(0, -0.5);
    shape.quadraticCurveTo(0.3, -0.2, 0.25, 0.2);
    shape.quadraticCurveTo(0.15, 0.4, 0, 0.5);
    shape.quadraticCurveTo(-0.15, 0.4, -0.25, 0.2);
    shape.quadraticCurveTo(-0.3, -0.2, 0, -0.5);
    
    return shape;
  }, []);

  return (
    <mesh ref={meshRef} position={position} rotation={rotation} scale={scale}>
      <shapeGeometry args={[leafShape]} />
      <meshBasicMaterial 
        color={color} 
        transparent 
        opacity={0.6}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

interface FloatingLeavesProps {
  count?: number;
}

export function FloatingLeaves({ count = 18 }: FloatingLeavesProps) {
  const leaves = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      // Distribute leaves across the scene
      const x = (Math.random() - 0.5) * 14;
      const y = (Math.random() - 0.5) * 12;
      const z = (Math.random() - 0.5) * 6 - 2; // Push back a bit
      
      // Random rotations
      const rotX = Math.random() * Math.PI;
      const rotY = Math.random() * Math.PI;
      const rotZ = Math.random() * Math.PI;
      
      // Vary sizes
      const scale = 0.4 + Math.random() * 0.6;
      
      // Pick color (mostly sage, occasional terracotta accent)
      const color = i % 7 === 0 
        ? ACCENT_COLOR 
        : LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)];
      
      // Vary animation speeds for organic feel
      const speed = 0.15 + Math.random() * 0.2;
      const rotationSpeed = 0.3 + Math.random() * 0.4;
      const driftAmplitude = 0.5 + Math.random() * 1;
      const driftFrequency = 0.3 + Math.random() * 0.4;

      return {
        key: i,
        position: [x, y, z] as [number, number, number],
        rotation: [rotX, rotY, rotZ] as [number, number, number],
        scale,
        color,
        speed,
        rotationSpeed,
        driftAmplitude,
        driftFrequency,
      };
    });
  }, [count]);

  return (
    <group>
      {/* Soft ambient light */}
      <ambientLight intensity={0.8} />
      
      {/* Subtle directional light for depth */}
      <directionalLight 
        position={[5, 5, 5]} 
        intensity={0.3} 
        color="#F9F6F1" // cream
      />
      
      {leaves.map((leaf) => (
        <Leaf {...leaf} key={leaf.key} />
      ))}
    </group>
  );
}


