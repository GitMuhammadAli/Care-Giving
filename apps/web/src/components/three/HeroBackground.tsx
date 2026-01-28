'use client';

import React, { Suspense, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Canvas with SSR disabled to prevent Three.js from running on server
const Canvas = dynamic(
  () => import('@react-three/fiber').then((mod) => mod.Canvas),
  { ssr: false }
);

// Dynamically import FloatingLeaves with SSR disabled
const FloatingLeaves = dynamic(
  () => import('./FloatingLeaves').then((mod) => mod.FloatingLeaves),
  { ssr: false }
);

function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

function useIsLowEndDevice() {
  const [isLowEnd, setIsLowEnd] = useState(false);

  useEffect(() => {
    // Check for low-end device indicators
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const deviceMemory = (navigator as unknown as { deviceMemory?: number }).deviceMemory || 4;
    
    // Consider low-end if less than 4 cores or less than 4GB RAM
    setIsLowEnd(hardwareConcurrency < 4 || deviceMemory < 4);
  }, []);

  return isLowEnd;
}

// Static fallback for reduced motion or low-end devices
function StaticBackground() {
  return (
    <div 
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{
        background: `
          radial-gradient(ellipse at 20% 30%, rgba(168, 181, 160, 0.15) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 70%, rgba(168, 181, 160, 0.1) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 50%, rgba(153, 107, 77, 0.05) 0%, transparent 40%)
        `,
      }}
    >
      {/* Static decorative leaf shapes */}
      <div 
        className="absolute top-1/4 left-[20%] w-8 h-12 opacity-20 rotate-12"
        style={{
          background: 'linear-gradient(135deg, #8B9A7E 0%, #6B7A5E 100%)',
          borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
        }}
      />
      <div 
        className="absolute top-2/3 right-1/4 w-6 h-10 opacity-15 -rotate-45"
        style={{
          background: 'linear-gradient(135deg, #9AAA8D 0%, #8B9A7E 100%)',
          borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
        }}
      />
      <div 
        className="absolute bottom-1/3 left-1/3 w-5 h-8 opacity-10 rotate-[30deg]"
        style={{
          background: 'linear-gradient(135deg, #996B4D 0%, #8B9A7E 100%)',
          borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
        }}
      />
    </div>
  );
}

// Loading placeholder
function LoadingFallback() {
  return (
    <div className="absolute inset-0 bg-transparent" />
  );
}

interface HeroBackgroundProps {
  className?: string;
}

// Simple error boundary component
interface ErrorBoundaryProps {
  children: React.ReactNode;
  onError: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

export function HeroBackground({ className = '' }: HeroBackgroundProps) {
  const prefersReducedMotion = useReducedMotion();
  const isLowEnd = useIsLowEndDevice();
  const [hasError, setHasError] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Don't render anything on server
  if (!isClient) {
    return <LoadingFallback />;
  }

  // Show static background for reduced motion, low-end devices, or errors
  if (prefersReducedMotion || isLowEnd || hasError) {
    return <StaticBackground />;
  }

  return (
    <div 
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{ zIndex: 0 }}
    >
      <Suspense fallback={<LoadingFallback />}>
        <ErrorBoundary onError={() => setHasError(true)}>
          <Canvas
            camera={{ position: [0, 0, 8], fov: 50 }}
            style={{ 
              background: 'transparent',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
            }}
            gl={{ 
              alpha: true, 
              antialias: true,
              powerPreference: 'low-power',
            }}
            dpr={[1, 1.5]} // Limit pixel ratio for performance
          >
            <FloatingLeaves count={15} />
          </Canvas>
        </ErrorBoundary>
      </Suspense>
    </div>
  );
}
