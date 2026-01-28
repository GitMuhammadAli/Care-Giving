'use client';

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * Optimized floating leaves background
 * - Uses GPU-accelerated transforms only
 * - Reduced number of elements for performance
 * - CSS will-change hints
 */

// Memoized leaf component to prevent re-renders
const Leaf = memo(function Leaf({ color }: { color: string }) {
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
});

// Optimized floating leaf - uses only transform and opacity (GPU accelerated)
const FloatingLeaf = memo(function FloatingLeaf({
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
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden',
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
        x: [0, 25, -15, 30, 0],
        rotate: [
          initialRotation, 
          initialRotation + 12, 
          initialRotation - 8, 
          initialRotation + 15, 
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
});

// Main component - memoized
export const AnimatedBackground = memo(function AnimatedBackground() {
  // Sage green color palette
  const colors = useMemo(() => [
    '#8B9A7E',
    '#6B7A5E', 
    '#525E48',
    '#9AAA8D',
    '#A8B5A0',
    '#996B4D',
  ], []);

  // Reduced to 12 leaves for better performance
  const leaves = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      delay: i * 1.5,
      duration: 16 + (i % 4) * 2, // 16-22 seconds
      startX: 8 + (i * 7.5) % 85,
      size: 30 + (i % 3) * 6, // 30-42px
      color: i % 6 === 0 ? colors[5] : colors[i % 5],
      initialRotation: -35 + (i * 12) % 70,
    }));
  }, [colors]);

  return (
    <div 
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ 
        contain: 'layout style paint',
        willChange: 'auto',
      }}
    >
      {/* Static gradient background - no animation for performance */}
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
});
