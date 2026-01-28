'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';

/**
 * Clean floating leaves background - like the original Three.js version
 * Simple, elegant, not over-engineered
 */

// Simple leaf SVG
function Leaf({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 32 48" className="w-full h-full">
      <path
        d="M16 2C16 2 30 14 30 28C30 38 23.627 46 16 46C8.373 46 2 38 2 28C2 14 16 2 16 2Z"
        fill={color}
      />
      <path
        d="M16 8V42M16 16L10 22M16 24L22 30M16 32L12 36"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Single floating leaf - simple upward float with drift
function FloatingLeaf({
  delay,
  duration,
  startX,
  size,
  color,
  initialRotation,
}: {
  delay: number;
  duration: number;
  startX: number;
  size: number;
  color: string;
  initialRotation: number;
}) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: `${startX}%`,
        bottom: -80,
        width: size,
        height: size * 1.5,
      }}
      initial={{ 
        opacity: 0, 
        y: 0, 
        rotate: initialRotation,
        x: 0,
      }}
      animate={{
        opacity: [0, 0.7, 0.7, 0.7, 0],
        y: [0, -250, -500, -750, -1000],
        x: [0, 30, -20, 40, 0],
        rotate: [
          initialRotation, 
          initialRotation + 15, 
          initialRotation - 10, 
          initialRotation + 20, 
          initialRotation
        ],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      <Leaf color={color} />
    </motion.div>
  );
}

export function AnimatedBackground() {
  // Sage green color palette (matching the original)
  const colors = useMemo(() => [
    '#8B9A7E', // sage-500
    '#6B7A5E', // sage-600
    '#525E48', // sage-700
    '#9AAA8D', // sage-400
    '#A8B5A0', // sage-light
    '#996B4D', // terracotta accent (sparingly)
  ], []);

  // Generate 18 leaves like the original
  const leaves = useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => ({
      id: i,
      delay: i * 1.2, // Staggered start
      duration: 14 + Math.random() * 8, // 14-22 seconds to float up
      startX: 5 + (i * 5.5) % 90, // Spread across screen
      size: 28 + Math.random() * 16, // 28-44px
      color: i % 7 === 0 ? colors[5] : colors[Math.floor(Math.random() * 5)], // Occasional terracotta
      initialRotation: -40 + Math.random() * 80, // -40 to 40 degrees
    }));
  }, [colors]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Soft gradient background */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% 30%, rgba(168, 181, 160, 0.25) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 70%, rgba(139, 154, 126, 0.2) 0%, transparent 50%),
            radial-gradient(ellipse 50% 30% at 50% 50%, rgba(153, 107, 77, 0.08) 0%, transparent 40%)
          `,
        }}
      />

      {/* Floating leaves */}
      {leaves.map((leaf) => (
        <FloatingLeaf key={leaf.id} {...leaf} />
      ))}
    </div>
  );
}
