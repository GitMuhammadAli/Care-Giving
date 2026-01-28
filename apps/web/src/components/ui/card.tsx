'use client';

import * as React from 'react';
import { motion, HTMLMotionProps, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  variant?: 'default' | 'interactive' | 'highlighted' | 'urgent' | 'success' | 'glass';
  padding?: 'none' | 'compact' | 'default' | 'spacious';
  children?: React.ReactNode;
  noHover?: boolean;
}

// Unique "Connection Glow" effect on hover
function ConnectionGlow({ isHovered }: { isHovered: boolean }) {
  return (
    <>
      {/* Animated corner accents */}
      <motion.span
        className="absolute top-0 left-0 w-8 h-8 pointer-events-none"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={isHovered ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
        transition={{ duration: 0.3 }}
      >
        <svg viewBox="0 0 32 32" className="w-full h-full">
          <motion.path
            d="M0 12 L0 0 L12 0"
            stroke="#8B9A7E"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: isHovered ? 1 : 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          />
        </svg>
      </motion.span>
      
      <motion.span
        className="absolute top-0 right-0 w-8 h-8 pointer-events-none"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={isHovered ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
        transition={{ duration: 0.3 }}
      >
        <svg viewBox="0 0 32 32" className="w-full h-full">
          <motion.path
            d="M32 12 L32 0 L20 0"
            stroke="#8B9A7E"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: isHovered ? 1 : 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          />
        </svg>
      </motion.span>
      
      <motion.span
        className="absolute bottom-0 left-0 w-8 h-8 pointer-events-none"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={isHovered ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
        transition={{ duration: 0.3 }}
      >
        <svg viewBox="0 0 32 32" className="w-full h-full">
          <motion.path
            d="M0 20 L0 32 L12 32"
            stroke="#8B9A7E"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: isHovered ? 1 : 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          />
        </svg>
      </motion.span>
      
      <motion.span
        className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={isHovered ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
        transition={{ duration: 0.3 }}
      >
        <svg viewBox="0 0 32 32" className="w-full h-full">
          <motion.path
            d="M32 20 L32 32 L20 32"
            stroke="#8B9A7E"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: isHovered ? 1 : 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          />
        </svg>
      </motion.span>
      
      {/* Soft glow */}
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        style={{
          boxShadow: '0 8px 40px rgba(139, 154, 126, 0.15), 0 0 60px rgba(139, 154, 126, 0.08)',
        }}
      />
    </>
  );
}

// Spotlight effect that follows cursor
function SpotlightEffect({ mouseX, mouseY, isHovered }: { mouseX: any; mouseY: any; isHovered: boolean }) {
  return (
    <motion.div
      className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: isHovered ? 1 : 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="absolute w-64 h-64 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          x: mouseX,
          y: mouseY,
          background: 'radial-gradient(circle, rgba(139, 154, 126, 0.12) 0%, transparent 70%)',
        }}
      />
    </motion.div>
  );
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'default', children, noHover = false, ...props }, ref) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const isInteractive = variant === 'interactive';
    
    // Mouse position for spotlight
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const springX = useSpring(mouseX, { stiffness: 300, damping: 30 });
    const springY = useSpring(mouseY, { stiffness: 300, damping: 30 });
    
    // 3D tilt
    const rotateX = useSpring(useTransform(mouseY, [0, 200], [3, -3]), { stiffness: 300, damping: 30 });
    const rotateY = useSpring(useTransform(mouseX, [0, 300], [-3, 3]), { stiffness: 300, damping: 30 });
    
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isInteractive || noHover) return;
      const rect = e.currentTarget.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    };
    
    const handleMouseLeave = () => {
      setIsHovered(false);
      mouseX.set(150);
      mouseY.set(100);
    };
    
    const variants = {
      default: 'bg-card border border-border shadow-sm',
      interactive: 'bg-card border border-border shadow-sm cursor-pointer',
      highlighted: 'bg-card border border-border shadow-sm border-l-4 border-l-secondary',
      urgent: 'bg-destructive/10 border border-destructive/20 shadow-sm border-l-4 border-l-destructive',
      success: 'bg-primary/10 border border-primary/20 shadow-sm border-l-4 border-l-primary',
      glass: 'bg-card/80 backdrop-blur-md border border-border/50 shadow-lg',
    };

    const paddings = {
      none: 'p-0',
      compact: 'p-4',
      default: 'p-5',
      spacious: 'p-6',
    };

    const shouldAnimate = isInteractive && !noHover;

    return (
      <motion.div
        ref={ref}
        className={cn(
          'rounded-xl text-card-foreground transition-colors duration-200 relative overflow-visible',
          variants[variant],
          paddings[padding],
          className
        )}
        onMouseEnter={() => shouldAnimate && setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        style={{
          rotateX: shouldAnimate ? rotateX : 0,
          rotateY: shouldAnimate ? rotateY : 0,
          transformStyle: 'preserve-3d',
        }}
        animate={{
          y: shouldAnimate && isHovered ? -6 : 0,
          scale: shouldAnimate && isHovered ? 1.01 : 1,
        }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 25,
        }}
        {...props}
      >
        {/* Connection glow effect */}
        {shouldAnimate && <ConnectionGlow isHovered={isHovered} />}
        
        {/* Spotlight effect */}
        {shouldAnimate && <SpotlightEffect mouseX={springX} mouseY={springY} isHovered={isHovered} />}
        
        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
      </motion.div>
    );
  }
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('font-serif text-2xl font-normal leading-none tracking-editorial text-foreground', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center p-6 pt-0', className)}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
