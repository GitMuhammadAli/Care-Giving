'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';

/**
 * Soft, calming animated background with floating leaves
 * Uses CSS and Framer Motion for a warm, professional caregiving feel
 */

// Leaf SVG component
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
      viewBox="0 0 24 40" 
      fill="none" 
      className={className}
      style={style}
    >
      <path
        d="M12 0C12 0 24 12 24 24C24 32 18.627 40 12 40C5.373 40 0 32 0 24C0 12 12 0 12 0Z"
        fill={color}
      />
      <path
        d="M12 8V36M12 14L8 18M12 20L16 24M12 26L9 29"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Single floating leaf with animation
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
        height: size * 1.6,
      }}
      initial={{ 
        opacity: 0, 
        y: 0,
        rotate: rotation,
      }}
      animate={{
        opacity: [0, 0.6, 0.6, 0],
        y: [0, -150, -300, -450],
        x: [0, 20, -15, 10],
        rotate: [rotation, rotation + 15, rotation - 10, rotation + 5],
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

export function AnimatedBackground() {
  // Generate leaf configurations
  const leaves = useMemo(() => {
    const colors = [
      'rgba(139, 154, 126, 0.4)',  // sage-500
      'rgba(168, 181, 160, 0.35)', // sage-light
      'rgba(107, 122, 94, 0.3)',   // sage-600
      'rgba(154, 170, 141, 0.35)', // sage-400
      'rgba(153, 107, 77, 0.25)',  // terracotta accent
    ];
    
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      delay: i * 2.5 + Math.random() * 2,
      duration: 12 + Math.random() * 8,
      startX: `${10 + (i * 7) % 80}%`,
      startY: `${85 + Math.random() * 20}%`,
      size: 16 + Math.random() * 14,
      color: colors[i % colors.length],
      rotation: -30 + Math.random() * 60,
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient layer */}
      <div 
        className="absolute inset-0 opacity-60"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% 40%, rgba(168, 181, 160, 0.3) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 60%, rgba(139, 154, 126, 0.2) 0%, transparent 50%),
            radial-gradient(ellipse 50% 30% at 50% 80%, rgba(153, 107, 77, 0.08) 0%, transparent 50%)
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
          background: 'radial-gradient(circle, rgba(168, 181, 160, 0.25) 0%, rgba(168, 181, 160, 0) 70%)',
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
          background: 'radial-gradient(circle, rgba(139, 154, 126, 0.2) 0%, rgba(139, 154, 126, 0) 70%)',
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
          background: 'radial-gradient(circle, rgba(153, 107, 77, 0.12) 0%, rgba(153, 107, 77, 0) 70%)',
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

      {/* Floating leaves */}
      {leaves.map((leaf) => (
        <FloatingLeaf key={leaf.id} {...leaf} />
      ))}

      {/* Subtle grain texture overlay for warmth */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
