'use client';

import { memo } from 'react';

/**
 * UNIQUE "Living Canvas" Background
 * - Morphing gradient orbs (CSS only - no JS animation)
 * - Floating leaves with organic movement
 * - "Heartbeat" pulse effect
 * - All CSS-based for 60fps performance
 */

// CSS-animated morphing orb
const MorphingOrb = memo(function MorphingOrb({
  color,
  size,
  position,
  delay,
}: {
  color: string;
  size: string;
  position: { top?: string; left?: string; right?: string; bottom?: string };
  delay: string;
}) {
  return (
    <div
      className="absolute pointer-events-none animate-morph-float"
      style={{
        ...position,
        width: size,
        height: size,
        background: `radial-gradient(circle at 30% 30%, ${color}, transparent 70%)`,
        borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
        filter: 'blur(40px)',
        animationDelay: delay,
        willChange: 'transform, border-radius',
      }}
    />
  );
});

// Unique floating leaf with CSS keyframe animation
const FloatingLeaf = memo(function FloatingLeaf({
  delay,
  duration,
  startX,
  size,
  color,
}: {
  delay: number;
  duration: number;
  startX: number;
  size: number;
  color: string;
}) {
  return (
    <div
      className="absolute pointer-events-none animate-leaf-rise"
      style={{
        left: `${startX}%`,
        bottom: '-80px',
        width: size,
        height: size * 1.5,
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
        willChange: 'transform, opacity',
      }}
    >
      <svg viewBox="0 0 32 48" className="w-full h-full animate-leaf-sway" style={{ animationDelay: `${delay * 0.5}s` }}>
        <defs>
          <linearGradient id={`leaf-${startX}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="0.5" />
          </linearGradient>
        </defs>
        <path
          d="M16 2C16 2 30 14 30 28C30 38 23.627 46 16 46C8.373 46 2 38 2 28C2 14 16 2 16 2Z"
          fill={`url(#leaf-${startX})`}
        />
        <path
          d="M16 8V42M16 16L10 22M16 24L22 30M16 32L12 36"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
});

// Heartbeat pulse ring
const HeartbeatPulse = memo(function HeartbeatPulse({
  x,
  y,
  delay,
}: {
  x: string;
  y: string;
  delay: string;
}) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{ left: x, top: y }}
    >
      <div
        className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full bg-sage-500/30 animate-heartbeat-pulse"
        style={{ animationDelay: delay }}
      />
      <div
        className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border border-sage-500/20 animate-heartbeat-ring"
        style={{ animationDelay: delay }}
      />
    </div>
  );
});

// Living gradient mesh
const LivingMesh = memo(function LivingMesh() {
  return (
    <div className="absolute inset-0 animate-mesh-breathe" style={{ willChange: 'opacity' }}>
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% 30%, rgba(168, 181, 160, 0.3) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 70%, rgba(139, 154, 126, 0.25) 0%, transparent 50%),
            radial-gradient(ellipse 50% 35% at 50% 50%, rgba(153, 107, 77, 0.12) 0%, transparent 40%)
          `,
        }}
      />
    </div>
  );
});

export const AnimatedBackground = memo(function AnimatedBackground() {
  // Leaf configurations
  const leaves = [
    { delay: 0, duration: 18, startX: 8, size: 32, color: '#8B9A7E' },
    { delay: 2, duration: 22, startX: 20, size: 28, color: '#6B7A5E' },
    { delay: 4, duration: 16, startX: 35, size: 36, color: '#9AAA8D' },
    { delay: 1, duration: 20, startX: 50, size: 30, color: '#525E48' },
    { delay: 3, duration: 24, startX: 65, size: 34, color: '#A8B5A0' },
    { delay: 5, duration: 18, startX: 78, size: 26, color: '#996B4D' },
    { delay: 2.5, duration: 21, startX: 90, size: 32, color: '#8B9A7E' },
    { delay: 6, duration: 19, startX: 15, size: 28, color: '#6B7A5E' },
    { delay: 4.5, duration: 23, startX: 42, size: 30, color: '#9AAA8D' },
    { delay: 7, duration: 17, startX: 72, size: 34, color: '#525E48' },
    { delay: 3.5, duration: 20, startX: 85, size: 26, color: '#A8B5A0' },
    { delay: 8, duration: 22, startX: 28, size: 32, color: '#8B9A7E' },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Living gradient mesh - breathes slowly */}
      <LivingMesh />

      {/* Morphing orbs - unique organic shapes */}
      <MorphingOrb
        color="rgba(168, 181, 160, 0.4)"
        size="50vw"
        position={{ top: '-10%', left: '-10%' }}
        delay="0s"
      />
      <MorphingOrb
        color="rgba(139, 154, 126, 0.35)"
        size="40vw"
        position={{ bottom: '10%', right: '-5%' }}
        delay="-8s"
      />
      <MorphingOrb
        color="rgba(153, 107, 77, 0.2)"
        size="30vw"
        position={{ top: '40%', left: '30%' }}
        delay="-16s"
      />

      {/* Heartbeat pulses - representing care */}
      <HeartbeatPulse x="15%" y="25%" delay="0s" />
      <HeartbeatPulse x="85%" y="35%" delay="-2s" />
      <HeartbeatPulse x="50%" y="75%" delay="-4s" />
      <HeartbeatPulse x="25%" y="60%" delay="-6s" />
      <HeartbeatPulse x="75%" y="80%" delay="-3s" />

      {/* Floating leaves */}
      {leaves.map((leaf, i) => (
        <FloatingLeaf key={i} {...leaf} />
      ))}
    </div>
  );
});
