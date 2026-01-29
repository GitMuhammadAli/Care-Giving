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

/**
 * UNIQUE "Embrace Card" Animation
 * - Warmth spotlight that follows cursor
 * - Living border that responds to interaction
 * - 3D tilt with depth
 * - Organic corner radius morphing
 */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'default', children, noHover = false, ...props }, ref) => {
    const isInteractive = variant === 'interactive';
    const cardRef = React.useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = React.useState(false);
    
    // Mouse position for spotlight
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    
    // Smooth spring animation
    const springConfig = { damping: 30, stiffness: 400 };
    const spotlightX = useSpring(mouseX, springConfig);
    const spotlightY = useSpring(mouseY, springConfig);
    
    // 3D tilt transforms
    const rotateX = useTransform(spotlightY, [0, 100], [3, -3]);
    const rotateY = useTransform(spotlightX, [0, 100], [-3, 3]);
    
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

    const handleMouseMove = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (!shouldAnimate) return;
      const card = cardRef.current;
      if (!card) return;
      
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      mouseX.set(x);
      mouseY.set(y);
    }, [shouldAnimate, mouseX, mouseY]);

    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => {
      setIsHovered(false);
      mouseX.set(50);
      mouseY.set(50);
    };

    // Combine refs
    React.useImperativeHandle(ref, () => cardRef.current as HTMLDivElement);

    return (
      <motion.div
        ref={cardRef}
        className={cn(
          'rounded-xl text-card-foreground relative overflow-hidden group',
          variants[variant],
          paddings[padding],
          className
        )}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX: shouldAnimate ? rotateX : 0,
          rotateY: shouldAnimate ? rotateY : 0,
          transformStyle: 'preserve-3d',
          willChange: shouldAnimate ? 'transform' : 'auto',
          perspective: '1000px',
        }}
        whileHover={shouldAnimate ? {
          y: -6,
          scale: 1.01,
          boxShadow: '0 20px 40px rgba(0,0,0,0.1), 0 8px 16px rgba(139,154,126,0.1)',
          borderRadius: '16px 12px 16px 12px',
        } : undefined}
        whileTap={shouldAnimate ? { 
          scale: 0.99,
          y: -2,
        } : undefined}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 25,
        }}
        {...props}
      >
        {/* Warmth spotlight overlay */}
        {shouldAnimate && (
          <motion.div
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: `radial-gradient(
                300px circle at ${spotlightX.get()}% ${spotlightY.get()}%,
                rgba(139, 154, 126, 0.12),
                transparent 60%
              )`,
            }}
          />
        )}
        
        {/* Living border glow */}
        {shouldAnimate && isHovered && (
          <motion.div
            className="absolute inset-0 rounded-[inherit] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              boxShadow: [
                'inset 0 0 0 1px rgba(139,154,126,0.1)',
                'inset 0 0 0 2px rgba(139,154,126,0.15)',
                'inset 0 0 0 1px rgba(139,154,126,0.1)',
              ],
            }}
            transition={{
              boxShadow: {
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              },
            }}
          />
        )}
        
        {/* Corner accent lines */}
        {shouldAnimate && (
          <>
            <motion.span
              className="absolute top-0 left-0 w-6 h-[2px] bg-sage-500/0 group-hover:bg-sage-500/40 transition-colors duration-300"
              style={{ originX: 0 }}
            />
            <motion.span
              className="absolute top-0 left-0 h-6 w-[2px] bg-sage-500/0 group-hover:bg-sage-500/40 transition-colors duration-300"
              style={{ originY: 0 }}
            />
            <motion.span
              className="absolute bottom-0 right-0 w-6 h-[2px] bg-sage-500/0 group-hover:bg-sage-500/40 transition-colors duration-300"
              style={{ originX: 1 }}
            />
            <motion.span
              className="absolute bottom-0 right-0 h-6 w-[2px] bg-sage-500/0 group-hover:bg-sage-500/40 transition-colors duration-300"
              style={{ originY: 1 }}
            />
          </>
        )}
        
        {/* Content with depth */}
        <div className="relative z-10" style={{ transform: shouldAnimate ? 'translateZ(20px)' : 'none' }}>
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
