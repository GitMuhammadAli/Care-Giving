'use client';

import * as React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  variant?: 'default' | 'interactive' | 'highlighted' | 'urgent' | 'success' | 'glass';
  padding?: 'none' | 'compact' | 'default' | 'spacious';
  children?: React.ReactNode;
  // Disable hover animations
  noHover?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'default', children, noHover = false, ...props }, ref) => {
    const isInteractive = variant === 'interactive';
    
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
          'rounded-xl text-card-foreground transition-colors duration-200',
          variants[variant],
          paddings[padding],
          className
        )}
        initial={false}
        whileHover={shouldAnimate ? {
          y: -4,
          boxShadow: '0 8px 30px rgba(82, 94, 72, 0.12), 0 4px 12px rgba(82, 94, 72, 0.08)',
          borderColor: 'hsl(92 14% 32%)',
        } : undefined}
        whileTap={shouldAnimate ? { 
          scale: 0.98,
          y: -2,
        } : undefined}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 25,
        }}
        {...props}
      >
        {children}
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
