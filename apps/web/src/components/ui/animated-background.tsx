'use client';

import { memo } from 'react';

/**
 * "Living Canvas" Background - Nature-Inspired
 * 
 * Features:
 * - Soft sage/cream gradient that breathes
 * - Leaves falling gently from top to bottom with wind drift
 * - Morphing gradient orbs for depth
 * - Subtle heartbeat pulses representing care
 * 
 * All CSS-based for smooth 60fps performance
 */

// Falling leaf with natural wind drift
const FallingLeaf = memo(function FallingLeaf({
  delay,
  duration,
  startX,
  size,
  color,
  drift,
}: {
  delay: number;
  duration: number;
  startX: number;
  size: number;
  color: string;
  drift: number; // horizontal drift direction (-1 left, 1 right)
}) {
  return (
    <div
      className="absolute pointer-events-none animate-leaf-fall"
      style={{
        left: `${startX}%`,
        top: '-60px',
        width: size,
        height: size * 1.4,
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
        ['--drift' as string]: `${drift * 80}px`,
        willChange: 'transform, opacity',
      }}
    >
      <svg 
        viewBox="0 0 32 48" 
        className="w-full h-full animate-leaf-sway" 
        style={{ animationDelay: `${delay * 0.3}s` }}
      >
        <defs>
          <linearGradient id={`leaf-fall-${startX}-${delay}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.85" />
            <stop offset="100%" stopColor={color} stopOpacity="0.4" />
          </linearGradient>
        </defs>
        {/* Leaf shape */}
        <path
          d="M16 2C16 2 30 14 30 28C30 38 23.627 46 16 46C8.373 46 2 38 2 28C2 14 16 2 16 2Z"
          fill={`url(#leaf-fall-${startX}-${delay})`}
        />
        {/* Leaf veins */}
        <path
          d="M16 8V42M16 16L10 22M16 24L22 30M16 32L12 36"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
});

// Soft morphing gradient orb
const GradientOrb = memo(function GradientOrb({
  color,
  size,
  position,
  delay,
  blur,
}: {
  color: string;
  size: string;
  position: { top?: string; left?: string; right?: string; bottom?: string };
  delay: string;
  blur?: number;
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
        filter: `blur(${blur || 50}px)`,
        animationDelay: delay,
        willChange: 'transform, border-radius',
      }}
    />
  );
});

// Heartbeat pulse - subtle care indicator
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
        className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full bg-sage-500/20 animate-heartbeat-pulse"
        style={{ animationDelay: delay }}
      />
      <div
        className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full border border-sage-500/15 animate-heartbeat-ring"
        style={{ animationDelay: delay }}
      />
    </div>
  );
});

// Main gradient background that "breathes"
const LivingGradient = memo(function LivingGradient() {
  return (
    <div className="absolute inset-0 animate-mesh-breathe">
      {/* Base gradient - sage to cream */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(135deg, 
              rgba(168, 181, 160, 0.15) 0%, 
              rgba(250, 248, 244, 0.05) 25%,
              rgba(139, 154, 126, 0.12) 50%,
              rgba(250, 248, 244, 0.08) 75%,
              rgba(168, 181, 160, 0.15) 100%
            )
          `,
        }}
      />
      {/* Radial gradient overlays for depth */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 15% 20%, rgba(168, 181, 160, 0.25) 0%, transparent 50%),
            radial-gradient(ellipse 70% 50% at 85% 80%, rgba(139, 154, 126, 0.2) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 50% 50%, rgba(153, 107, 77, 0.08) 0%, transparent 40%)
          `,
        }}
      />
    </div>
  );
});

export const AnimatedBackground = memo(function AnimatedBackground() {
  // Leaf configurations - falling from top with varied properties
  const leaves = [
    // First wave - spread across screen
    { delay: 0, duration: 15, startX: 5, size: 28, color: '#8B9A7E', drift: 1 },
    { delay: 1.5, duration: 18, startX: 15, size: 32, color: '#6B7A5E', drift: -1 },
    { delay: 3, duration: 14, startX: 28, size: 26, color: '#9AAA8D', drift: 1 },
    { delay: 0.5, duration: 17, startX: 42, size: 30, color: '#525E48', drift: -1 },
    { delay: 2, duration: 16, startX: 55, size: 34, color: '#A8B5A0', drift: 1 },
    { delay: 4, duration: 19, startX: 68, size: 28, color: '#996B4D', drift: -1 }, // terracotta accent
    { delay: 1, duration: 15, startX: 82, size: 32, color: '#8B9A7E', drift: 1 },
    { delay: 3.5, duration: 18, startX: 92, size: 26, color: '#6B7A5E', drift: -1 },
    
    // Second wave - fill gaps
    { delay: 5, duration: 16, startX: 10, size: 30, color: '#9AAA8D', drift: -1 },
    { delay: 6.5, duration: 17, startX: 35, size: 28, color: '#525E48', drift: 1 },
    { delay: 7, duration: 15, startX: 60, size: 32, color: '#A8B5A0', drift: -1 },
    { delay: 8, duration: 19, startX: 75, size: 26, color: '#8B9A7E', drift: 1 },
    { delay: 5.5, duration: 16, startX: 88, size: 30, color: '#996B4D', drift: -1 }, // terracotta accent
    
    // Third wave - extra depth
    { delay: 9, duration: 18, startX: 22, size: 24, color: '#6B7A5E', drift: 1 },
    { delay: 10, duration: 14, startX: 48, size: 28, color: '#9AAA8D', drift: -1 },
    { delay: 11, duration: 17, startX: 78, size: 26, color: '#A8B5A0', drift: 1 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Living gradient background */}
      <LivingGradient />

      {/* Morphing gradient orbs for depth */}
      <GradientOrb
        color="rgba(168, 181, 160, 0.35)"
        size="60vw"
        position={{ top: '-15%', left: '-15%' }}
        delay="0s"
        blur={60}
      />
      <GradientOrb
        color="rgba(139, 154, 126, 0.3)"
        size="50vw"
        position={{ bottom: '5%', right: '-10%' }}
        delay="-10s"
        blur={50}
      />
      <GradientOrb
        color="rgba(153, 107, 77, 0.15)"
        size="35vw"
        position={{ top: '35%', left: '25%' }}
        delay="-20s"
        blur={45}
      />
      <GradientOrb
        color="rgba(168, 181, 160, 0.25)"
        size="40vw"
        position={{ top: '60%', right: '20%' }}
        delay="-15s"
        blur={55}
      />

      {/* Heartbeat pulses - subtle care indicators */}
      <HeartbeatPulse x="12%" y="20%" delay="0s" />
      <HeartbeatPulse x="88%" y="30%" delay="-2.5s" />
      <HeartbeatPulse x="45%" y="70%" delay="-5s" />
      <HeartbeatPulse x="20%" y="55%" delay="-7.5s" />
      <HeartbeatPulse x="72%" y="85%" delay="-4s" />
      <HeartbeatPulse x="35%" y="40%" delay="-6s" />

      {/* Falling leaves */}
      {leaves.map((leaf, i) => (
        <FallingLeaf key={i} {...leaf} />
      ))}
    </div>
  );
});
