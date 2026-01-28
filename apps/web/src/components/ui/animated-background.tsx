'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useMemo, useEffect, useState, useCallback } from 'react';

/**
 * UNIQUE "Care Embrace" Animated Background
 * - Breathing gradient mesh that expands/contracts
 * - Organic morphing blobs that represent care circles
 * - Floating leaf particles with magnetic attraction
 * - Connected thread network representing family bonds
 */

// Morphing blob paths - organic shapes that transform
const blobPaths = [
  "M44.5,-51.8C56.9,-42.9,65.8,-28.5,69.2,-12.5C72.6,3.5,70.5,21.1,62.1,35.1C53.7,49.1,39,59.5,22.7,65.4C6.4,71.3,-11.5,72.7,-27.8,67.5C-44.1,62.3,-58.8,50.5,-67.2,35.1C-75.6,19.7,-77.7,0.7,-73.1,-16.1C-68.5,-32.9,-57.2,-47.5,-43.4,-56.1C-29.6,-64.7,-13.3,-67.3,1.4,-69C16.1,-70.7,32.1,-60.7,44.5,-51.8Z",
  "M39.9,-47.2C52.5,-38.5,64.2,-27.1,68.7,-13C73.2,1.1,70.5,17.9,62.4,31.8C54.3,45.7,40.8,56.7,25.4,62.7C10,68.7,-7.3,69.7,-23.4,65C-39.5,60.3,-54.4,49.9,-63.2,35.6C-72,21.3,-74.7,3.1,-71.4,-13.5C-68.1,-30.1,-58.8,-45.1,-45.8,-53.7C-32.8,-62.3,-16.4,-64.5,-1.1,-63.2C14.2,-61.9,27.3,-55.9,39.9,-47.2Z",
  "M47.7,-55.1C60.1,-45.8,67.5,-29.5,70.1,-12.6C72.7,4.3,70.5,21.8,62.3,36.2C54.1,50.6,39.9,61.9,23.8,67.7C7.7,73.5,-10.3,73.8,-26.1,68.1C-41.9,62.4,-55.5,50.7,-64.3,35.8C-73.1,20.9,-77.1,2.8,-73.7,-13.5C-70.3,-29.8,-59.5,-44.3,-45.9,-53.4C-32.3,-62.5,-16.1,-66.2,0.7,-67C17.5,-67.8,35.3,-64.4,47.7,-55.1Z",
];

// Morphing organic blob component
function MorphingBlob({ 
  color, 
  size, 
  position, 
  delay = 0,
  duration = 20,
}: { 
  color: string; 
  size: number; 
  position: { top?: string; bottom?: string; left?: string; right?: string };
  delay?: number;
  duration?: number;
}) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        ...position,
        width: size,
        height: size,
      }}
    >
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <motion.path
          fill={color}
          initial={{ d: `path("${blobPaths[0]}")` }}
          animate={{
            d: blobPaths.map(p => `path("${p}")`),
          }}
          transition={{
            duration,
            delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          transform="translate(100, 100)"
        />
      </svg>
    </motion.div>
  );
}

// "Breathing" gradient that expands and contracts
function BreathingGradient() {
  return (
    <motion.div
      className="absolute inset-0"
      animate={{
        scale: [1, 1.05, 1],
        opacity: [0.6, 0.75, 0.6],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      style={{
        background: `
          radial-gradient(ellipse 120% 80% at 30% 20%, rgba(168, 181, 160, 0.4) 0%, transparent 50%),
          radial-gradient(ellipse 100% 60% at 70% 80%, rgba(139, 154, 126, 0.3) 0%, transparent 50%),
          radial-gradient(ellipse 80% 50% at 50% 50%, rgba(153, 107, 77, 0.15) 0%, transparent 40%)
        `,
      }}
    />
  );
}

// Magnetic floating leaf with cursor attraction
function MagneticLeaf({
  initialX,
  initialY,
  size,
  color,
  rotation,
  mouseX,
  mouseY,
}: {
  initialX: number;
  initialY: number;
  size: number;
  color: string;
  rotation: number;
  mouseX: any;
  mouseY: any;
}) {
  const x = useSpring(initialX, { stiffness: 50, damping: 20 });
  const y = useSpring(initialY, { stiffness: 50, damping: 20 });
  const rotate = useSpring(rotation, { stiffness: 30, damping: 15 });

  // Gentle magnetic attraction to cursor
  useEffect(() => {
    const unsubX = mouseX.on("change", (latest: number) => {
      const distance = Math.abs(latest - initialX);
      const attraction = Math.max(0, 1 - distance / 400) * 30;
      x.set(initialX + (latest > initialX ? attraction : -attraction));
    });
    const unsubY = mouseY.on("change", (latest: number) => {
      const distance = Math.abs(latest - initialY);
      const attraction = Math.max(0, 1 - distance / 400) * 30;
      y.set(initialY + (latest > initialY ? attraction : -attraction));
      rotate.set(rotation + (latest - initialY) * 0.02);
    });
    return () => {
      unsubX();
      unsubY();
    };
  }, [mouseX, mouseY, initialX, initialY, x, y, rotate, rotation]);

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        x,
        y,
        rotate,
        width: size,
        height: size * 1.5,
      }}
    >
      <svg viewBox="0 0 32 48" className="w-full h-full drop-shadow-sm">
        <defs>
          <linearGradient id={`leaf-grad-${initialX}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <path
          d="M16 2C16 2 30 14 30 28C30 38 23.627 46 16 46C8.373 46 2 38 2 28C2 14 16 2 16 2Z"
          fill={`url(#leaf-grad-${initialX})`}
        />
        <path
          d="M16 8V42M16 16L10 22M16 24L22 30M16 32L12 36"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
    </motion.div>
  );
}

// Floating rising leaf with drift
function RisingLeaf({
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
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: `${startX}%`,
        bottom: -100,
        width: size,
        height: size * 1.5,
      }}
      initial={{ opacity: 0, y: 0, rotate: -20 }}
      animate={{
        opacity: [0, 0.8, 0.8, 0.6, 0],
        y: [0, -300, -500, -700, -900],
        x: [0, 40, -30, 50, 0],
        rotate: [-20, 15, -25, 20, -10],
        scale: [0.8, 1, 1.1, 1, 0.9],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <svg viewBox="0 0 32 48" className="w-full h-full">
        <path
          d="M16 2C16 2 30 14 30 28C30 38 23.627 46 16 46C8.373 46 2 38 2 28C2 14 16 2 16 2Z"
          fill={color}
        />
        <path
          d="M16 8V42M16 16L10 22M16 24L22 30"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
    </motion.div>
  );
}

// Connecting thread network (care bonds)
function ConnectionThreads() {
  const paths = useMemo(() => [
    { d: "M0,200 Q200,100 400,200 T800,200", delay: 0 },
    { d: "M0,300 Q300,200 500,350 T900,250", delay: 2 },
    { d: "M100,100 Q250,300 500,150 T800,300", delay: 4 },
  ], []);

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
      <defs>
        <linearGradient id="thread-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(139, 154, 126, 0)" />
          <stop offset="50%" stopColor="rgba(139, 154, 126, 0.3)" />
          <stop offset="100%" stopColor="rgba(139, 154, 126, 0)" />
        </linearGradient>
      </defs>
      {paths.map((path, i) => (
        <motion.path
          key={i}
          d={path.d}
          stroke="url(#thread-gradient)"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="8 12"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ 
            pathLength: [0, 1, 1, 0],
            opacity: [0, 0.6, 0.6, 0],
            strokeDashoffset: [0, -100],
          }}
          transition={{
            duration: 15,
            delay: path.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </svg>
  );
}

// Care pulse ripple effect
function CarePulse({ x, y }: { x: string; y: string }) {
  return (
    <div className="absolute pointer-events-none" style={{ left: x, top: y }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-sage-500/30"
          style={{
            width: 20,
            height: 20,
            marginLeft: -10,
            marginTop: -10,
          }}
          animate={{
            scale: [1, 4, 6],
            opacity: [0.5, 0.2, 0],
          }}
          transition={{
            duration: 4,
            delay: i * 1.3,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

export function AnimatedBackground() {
  const [mounted, setMounted] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    mouseX.set(e.clientX);
    mouseY.set(e.clientY);
  }, [mouseX, mouseY]);

  // Magnetic leaves configuration
  const magneticLeaves = useMemo(() => [
    { x: 150, y: 200, size: 35, color: '#8B9A7E', rotation: 15 },
    { x: 300, y: 350, size: 28, color: '#9AAA8D', rotation: -25 },
    { x: 500, y: 180, size: 32, color: '#6B7A5E', rotation: 35 },
    { x: 700, y: 400, size: 26, color: '#A8B5A0', rotation: -10 },
    { x: 850, y: 250, size: 30, color: '#996B4D', rotation: 20 },
    { x: 200, y: 500, size: 24, color: '#8B9A7E', rotation: -30 },
    { x: 600, y: 550, size: 28, color: '#9AAA8D', rotation: 40 },
    { x: 400, y: 300, size: 22, color: '#6B7A5E', rotation: -15 },
  ], []);

  // Rising leaves configuration
  const risingLeaves = useMemo(() => 
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      delay: i * 2,
      duration: 18 + Math.random() * 8,
      startX: 5 + (i * 8) % 90,
      size: 30 + Math.random() * 18,
      color: ['#8B9A7E', '#9AAA8D', '#6B7A5E', '#A8B5A0', '#996B4D'][i % 5],
    }))
  , []);

  // Pulse positions
  const pulsePositions = useMemo(() => [
    { x: '20%', y: '30%' },
    { x: '75%', y: '25%' },
    { x: '50%', y: '70%' },
    { x: '85%', y: '60%' },
  ], []);

  if (!mounted) return null;

  return (
    <div 
      className="absolute inset-0 overflow-hidden pointer-events-auto"
      onMouseMove={handleMouseMove}
    >
      {/* Breathing gradient background */}
      <BreathingGradient />

      {/* Morphing organic blobs */}
      <MorphingBlob
        color="rgba(168, 181, 160, 0.2)"
        size={500}
        position={{ top: '-10%', left: '-5%' }}
        duration={25}
      />
      <MorphingBlob
        color="rgba(139, 154, 126, 0.15)"
        size={400}
        position={{ bottom: '10%', right: '-5%' }}
        delay={5}
        duration={30}
      />
      <MorphingBlob
        color="rgba(153, 107, 77, 0.1)"
        size={300}
        position={{ top: '40%', left: '50%' }}
        delay={10}
        duration={22}
      />

      {/* Connection threads (care bonds) */}
      <ConnectionThreads />

      {/* Care pulse ripples */}
      {pulsePositions.map((pos, i) => (
        <CarePulse key={i} x={pos.x} y={pos.y} />
      ))}

      {/* Magnetic leaves (react to cursor) */}
      {magneticLeaves.map((leaf, i) => (
        <MagneticLeaf
          key={`magnetic-${i}`}
          initialX={leaf.x}
          initialY={leaf.y}
          size={leaf.size}
          color={leaf.color}
          rotation={leaf.rotation}
          mouseX={mouseX}
          mouseY={mouseY}
        />
      ))}

      {/* Rising leaves */}
      {risingLeaves.map((leaf) => (
        <RisingLeaf key={`rising-${leaf.id}`} {...leaf} />
      ))}

      {/* Subtle noise texture */}
      <div 
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
