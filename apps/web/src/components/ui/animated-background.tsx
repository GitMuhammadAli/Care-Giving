'use client';

import { memo, useEffect, useRef, useState } from 'react';

/**
 * "Living Canvas" Background - Warm, Calming, Trustworthy
 * 
 * Performance Optimizations:
 * - GPU compositing with transform: translateZ(0)
 * - CSS containment for layer isolation
 * - IntersectionObserver to pause off-screen animations
 * - Respects prefers-reduced-motion
 * 
 * Features:
 * - Soft floating spheres that drift gently
 * - Gentle sage/cream gradient that slowly shifts
 * - Leaves falling naturally from top
 * - Smooth, organic movement throughout
 */

// Soft floating sphere - warm and calming (GPU optimized)
const FloatingSphere = memo(function FloatingSphere({
  color,
  size,
  position,
  delay,
  duration,
  blur,
  isPaused,
}: {
  color: string;
  size: string;
  position: { top?: string; left?: string; right?: string; bottom?: string };
  delay: number;
  duration: number;
  blur?: number;
  isPaused?: boolean;
}) {
  return (
    <div
      className="absolute pointer-events-none animate-sphere-float gpu-accelerated"
      style={{
        ...position,
        width: size,
        height: size,
        background: `radial-gradient(circle at 35% 35%, 
          ${color} 0%, 
          ${color.replace(/[\d.]+\)$/, '0.5)')} 40%,
          transparent 70%
        )`,
        borderRadius: '50%',
        filter: `blur(${blur || 40}px)`,
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
        animationPlayState: isPaused ? 'paused' : 'running',
        // GPU compositing optimizations
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        contain: 'layout style paint',
      }}
    />
  );
});

// Falling leaf with natural wind drift (GPU optimized)
const FallingLeaf = memo(function FallingLeaf({
  delay,
  duration,
  startX,
  size,
  color,
  drift,
  isPaused,
}: {
  delay: number;
  duration: number;
  startX: number;
  size: number;
  color: string;
  drift: number;
  isPaused?: boolean;
}) {
  return (
    <div
      className="absolute pointer-events-none animate-leaf-fall gpu-accelerated"
      style={{
        left: `${startX}%`,
        top: '-60px',
        width: size,
        height: size * 1.4,
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
        animationPlayState: isPaused ? 'paused' : 'running',
        ['--drift' as string]: `${drift * 80}px`,
        // GPU compositing optimizations
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        contain: 'layout style paint',
      }}
    >
      <svg 
        viewBox="0 0 32 48" 
        className="w-full h-full animate-leaf-sway" 
        style={{ 
          animationDelay: `${delay * 0.3}s`,
          animationPlayState: isPaused ? 'paused' : 'running',
        }}
      >
        <defs>
          <linearGradient id={`leaf-${startX}-${delay}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.8" />
            <stop offset="100%" stopColor={color} stopOpacity="0.35" />
          </linearGradient>
        </defs>
        <path
          d="M16 2C16 2 30 14 30 28C30 38 23.627 46 16 46C8.373 46 2 38 2 28C2 14 16 2 16 2Z"
          fill={`url(#leaf-${startX}-${delay})`}
        />
        <path
          d="M16 8V42M16 16L10 22M16 24L22 30M16 32L12 36"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
});

// Subtle pulse dot - representing care (GPU optimized)
const CarePoint = memo(function CarePoint({
  x,
  y,
  delay,
  size,
  isPaused,
}: {
  x: string;
  y: string;
  delay: number;
  size?: number;
  isPaused?: boolean;
}) {
  const dotSize = size || 6;
  return (
    <div
      className="absolute pointer-events-none gpu-accelerated"
      style={{ 
        left: x, 
        top: y,
        transform: 'translateZ(0)',
        contain: 'layout style paint',
      }}
    >
      <div
        className="rounded-full bg-sage-400/20 animate-care-pulse"
        style={{ 
          width: dotSize, 
          height: dotSize,
          marginLeft: -dotSize / 2,
          marginTop: -dotSize / 2,
          animationDelay: `${delay}s`,
          animationPlayState: isPaused ? 'paused' : 'running',
        }}
      />
    </div>
  );
});

// Main gradient background (GPU optimized)
const GradientBase = memo(function GradientBase() {
  return (
    <div className="absolute inset-0 gpu-accelerated" style={{ contain: 'layout style paint' }}>
      {/* Base warm gradient */}
      <div
        className="absolute inset-0 animate-gradient-shift"
        style={{
          background: `
            linear-gradient(
              145deg, 
              rgba(168, 181, 160, 0.18) 0%, 
              rgba(250, 248, 244, 0.08) 30%,
              rgba(139, 154, 126, 0.15) 60%,
              rgba(250, 248, 244, 0.1) 100%
            )
          `,
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
        }}
      />
      {/* Subtle radial overlays */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 100% 80% at 10% 10%, rgba(168, 181, 160, 0.2) 0%, transparent 50%),
            radial-gradient(ellipse 80% 60% at 90% 90%, rgba(139, 154, 126, 0.15) 0%, transparent 50%)
          `,
          transform: 'translateZ(0)',
        }}
      />
    </div>
  );
});

// Hook to pause animations when not visible
function useAnimationPause() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!containerRef.current || prefersReducedMotion) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Pause animations when less than 10% visible
        setIsPaused(!entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  return { containerRef, isPaused: isPaused || prefersReducedMotion, prefersReducedMotion };
}

export const AnimatedBackground = memo(function AnimatedBackground() {
  const { containerRef, isPaused, prefersReducedMotion } = useAnimationPause();

  // Sphere configurations - soft, warm colors
  const spheres = [
    // Large background spheres
    { color: 'rgba(168, 181, 160, 0.4)', size: '55vw', position: { top: '-20%', left: '-15%' }, delay: 0, duration: 25, blur: 60 },
    { color: 'rgba(139, 154, 126, 0.35)', size: '45vw', position: { bottom: '-10%', right: '-10%' }, delay: -8, duration: 30, blur: 55 },
    { color: 'rgba(153, 107, 77, 0.2)', size: '35vw', position: { top: '30%', left: '50%' }, delay: -15, duration: 28, blur: 50 },
    
    // Medium accent spheres
    { color: 'rgba(168, 181, 160, 0.3)', size: '25vw', position: { top: '60%', left: '10%' }, delay: -5, duration: 22, blur: 45 },
    { color: 'rgba(139, 154, 126, 0.25)', size: '20vw', position: { top: '15%', right: '15%' }, delay: -12, duration: 26, blur: 40 },
    
    // Small detail spheres
    { color: 'rgba(153, 107, 77, 0.15)', size: '15vw', position: { bottom: '25%', left: '35%' }, delay: -18, duration: 20, blur: 35 },
    { color: 'rgba(168, 181, 160, 0.2)', size: '12vw', position: { top: '45%', right: '25%' }, delay: -10, duration: 24, blur: 30 },
  ];

  // Leaf configurations
  const leaves = [
    { delay: 0, duration: 16, startX: 8, size: 26, color: '#8B9A7E', drift: 1 },
    { delay: 2, duration: 19, startX: 18, size: 30, color: '#6B7A5E', drift: -1 },
    { delay: 4, duration: 15, startX: 32, size: 24, color: '#9AAA8D', drift: 1 },
    { delay: 1, duration: 18, startX: 45, size: 28, color: '#525E48', drift: -1 },
    { delay: 3, duration: 17, startX: 58, size: 32, color: '#A8B5A0', drift: 1 },
    { delay: 5, duration: 20, startX: 72, size: 26, color: '#996B4D', drift: -1 },
    { delay: 1.5, duration: 16, startX: 85, size: 30, color: '#8B9A7E', drift: 1 },
    { delay: 6, duration: 18, startX: 95, size: 24, color: '#6B7A5E', drift: -1 },
    // Second wave
    { delay: 7, duration: 17, startX: 12, size: 28, color: '#9AAA8D', drift: -1 },
    { delay: 8, duration: 19, startX: 38, size: 26, color: '#525E48', drift: 1 },
    { delay: 9, duration: 15, startX: 62, size: 30, color: '#A8B5A0', drift: -1 },
    { delay: 10, duration: 20, startX: 78, size: 24, color: '#996B4D', drift: 1 },
  ];

  // Care points - subtle indicators
  const carePoints = [
    { x: '15%', y: '22%', delay: 0 },
    { x: '82%', y: '35%', delay: 2 },
    { x: '45%', y: '68%', delay: 4 },
    { x: '28%', y: '48%', delay: 6 },
    { x: '70%', y: '78%', delay: 3 },
  ];

  // If user prefers reduced motion, show static gradient only
  if (prefersReducedMotion) {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <GradientBase />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ 
        isolation: 'isolate',
        contain: 'layout style paint',
      }}
    >
      {/* Base gradient */}
      <GradientBase />

      {/* Floating spheres - soft and calming */}
      {spheres.map((sphere, i) => (
        <FloatingSphere key={`sphere-${i}`} {...sphere} isPaused={isPaused} />
      ))}

      {/* Subtle care points */}
      {carePoints.map((point, i) => (
        <CarePoint key={`care-${i}`} {...point} isPaused={isPaused} />
      ))}

      {/* Falling leaves */}
      {leaves.map((leaf, i) => (
        <FallingLeaf key={`leaf-${i}`} {...leaf} isPaused={isPaused} />
      ))}
    </div>
  );
});
