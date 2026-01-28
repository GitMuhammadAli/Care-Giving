'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';

/**
 * Soft, calming animated background with floating leaves
 * Uses CSS and Framer Motion for a warm, professional caregiving feel
 */

// Leaf SVG component - more detailed leaf shape
function Leaf({ 
  className, 
  style,
  color = '#8B9A7E'
}: { 
  className?: string; 
  style?: React.CSSProperties;
  color?: string;
}) {
  return (
    <svg 
      viewBox="0 0 32 48" 
      fill="none" 
      className={className}
      style={{ width: '100%', height: '100%', ...style }}
    >
      {/* Main leaf body */}
      <path
        d="M16 2C16 2 30 14 30 28C30 38 23.627 46 16 46C8.373 46 2 38 2 28C2 14 16 2 16 2Z"
        fill={color}
      />
      {/* Leaf veins for detail */}
      <path
        d="M16 8V42M16 16L10 22M16 24L22 30M16 32L12 36"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Floating leaf that drifts upward
function FloatingLeaf({ 
  delay, 
  duration, 
  startX, 
  startY,
  size,
  color,
  rotation,
}: {
  delay: number;
  duration: number;
  startX: string;
  startY: string;
  size: number;
  color: string;
  rotation: number;
}) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: startX,
        top: startY,
        width: size,
        height: size * 1.5,
      }}
      initial={{ 
        opacity: 0, 
        y: 0,
        rotate: rotation,
      }}
      animate={{
        opacity: [0, 0.85, 0.85, 0.85, 0],
        y: [0, -200, -400, -600, -800],
        x: [0, 30, -20, 25, -10],
        rotate: [rotation, rotation + 20, rotation - 15, rotation + 10, rotation],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <Leaf color={color} />
    </motion.div>
  );
}

// Static decorative leaf (always visible)
function StaticLeaf({
  x,
  y,
  size,
  color,
  rotation,
  opacity = 0.5,
}: {
  x: string;
  y: string;
  size: number;
  color: string;
  rotation: number;
  opacity?: number;
}) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: x,
        top: y,
        width: size,
        height: size * 1.5,
        opacity,
        rotate: rotation,
      }}
      animate={{
        rotate: [rotation, rotation + 5, rotation - 3, rotation],
        y: [0, -8, 0],
        x: [0, 3, -2, 0],
      }}
      transition={{
        duration: 6 + Math.random() * 4,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <Leaf color={color} />
    </motion.div>
  );
}

export function AnimatedBackground() {
  // Generate floating leaf configurations
  const floatingLeaves = useMemo(() => {
    const colors = [
      '#8B9A7E',  // sage-500 (solid)
      '#9AAA8D',  // sage-400
      '#6B7A5E',  // sage-600
      '#A8B5A0',  // sage-light
      '#996B4D',  // terracotta accent
    ];
    
    return Array.from({ length: 15 }, (_, i) => ({
      id: i,
      delay: i * 1.5,  // Faster stagger
      duration: 15 + Math.random() * 10,
      startX: `${5 + (i * 6.5) % 90}%`,
      startY: `${90 + Math.random() * 15}%`,
      size: 28 + Math.random() * 20,  // Bigger leaves
      color: colors[i % colors.length],
      rotation: -45 + Math.random() * 90,
    }));
  }, []);

  // Static decorative leaves (always visible)
  const staticLeaves = useMemo(() => [
    { x: '15%', y: '20%', size: 36, color: '#8B9A7E', rotation: 25, opacity: 0.35 },
    { x: '75%', y: '15%', size: 28, color: '#9AAA8D', rotation: -30, opacity: 0.3 },
    { x: '85%', y: '45%', size: 32, color: '#6B7A5E', rotation: 45, opacity: 0.25 },
    { x: '10%', y: '55%', size: 24, color: '#A8B5A0', rotation: -15, opacity: 0.3 },
    { x: '60%', y: '70%', size: 30, color: '#996B4D', rotation: 35, opacity: 0.2 },
    { x: '25%', y: '75%', size: 26, color: '#8B9A7E', rotation: -40, opacity: 0.28 },
    { x: '90%', y: '25%', size: 22, color: '#9AAA8D', rotation: 15, opacity: 0.22 },
    { x: '45%', y: '35%', size: 20, color: '#6B7A5E', rotation: -25, opacity: 0.18 },
  ], []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient layer */}
      <div 
        className="absolute inset-0 opacity-70"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% 40%, rgba(168, 181, 160, 0.35) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 60%, rgba(139, 154, 126, 0.25) 0%, transparent 50%),
            radial-gradient(ellipse 50% 30% at 50% 80%, rgba(153, 107, 77, 0.1) 0%, transparent 50%)
          `,
        }}
      />

      {/* Floating organic shape 1 - large, slow */}
      <motion.div
        className="absolute rounded-full blur-3xl"
        style={{
          width: '40vw',
          height: '40vw',
          maxWidth: '600px',
          maxHeight: '600px',
          background: 'radial-gradient(circle, rgba(168, 181, 160, 0.3) 0%, rgba(168, 181, 160, 0) 70%)',
          top: '10%',
          left: '5%',
        }}
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -40, 20, 0],
          scale: [1, 1.05, 0.95, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Floating organic shape 2 - medium, gentle drift */}
      <motion.div
        className="absolute rounded-full blur-3xl"
        style={{
          width: '30vw',
          height: '30vw',
          maxWidth: '450px',
          maxHeight: '450px',
          background: 'radial-gradient(circle, rgba(139, 154, 126, 0.25) 0%, rgba(139, 154, 126, 0) 70%)',
          top: '50%',
          right: '10%',
        }}
        animate={{
          x: [0, -40, 20, 0],
          y: [0, 30, -30, 0],
          scale: [1, 0.95, 1.05, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
      />

      {/* Floating organic shape 3 - small accent */}
      <motion.div
        className="absolute rounded-full blur-2xl"
        style={{
          width: '20vw',
          height: '20vw',
          maxWidth: '300px',
          maxHeight: '300px',
          background: 'radial-gradient(circle, rgba(153, 107, 77, 0.15) 0%, rgba(153, 107, 77, 0) 70%)',
          bottom: '20%',
          left: '30%',
        }}
        animate={{
          x: [0, 50, -30, 0],
          y: [0, -20, 40, 0],
          scale: [1, 1.1, 0.9, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 5,
        }}
      />

      {/* Static decorative leaves (always visible, gently swaying) */}
      {staticLeaves.map((leaf, i) => (
        <StaticLeaf key={`static-${i}`} {...leaf} />
      ))}

      {/* Floating leaves that drift upward */}
      {floatingLeaves.map((leaf) => (
        <FloatingLeaf key={leaf.id} {...leaf} />
      ))}

      {/* Subtle grain texture overlay for warmth */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
