'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion, HTMLMotionProps, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-body text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-sage-700 text-cream hover:bg-sage-600 shadow-md hover:shadow-lg',
        destructive: 'bg-destructive text-destructive-foreground hover:opacity-90 shadow-md',
        outline: 'border-2 border-sage-700 bg-transparent text-sage-700 hover:bg-sage-50 font-semibold',
        secondary: 'bg-sage-500 text-ink hover:bg-sage-600 hover:text-cream shadow-md',
        ghost: 'text-sage-700 hover:bg-sage-50 font-semibold',
        link: 'text-sage-700 underline-offset-4 hover:underline font-semibold',
        editorial: 'bg-sage-700 text-cream hover:bg-sage-600 tracking-caps uppercase text-xs font-bold shadow-md',
        'editorial-outline': 'border-2 border-sage-700 bg-transparent text-sage-700 hover:bg-sage-50 tracking-caps uppercase text-xs font-bold',
        sage: 'bg-sage-700 text-cream hover:bg-sage-600 shadow-md',
        'sage-light': 'bg-sage-500 text-ink hover:bg-sage-600 shadow-md',
        terracotta: 'bg-terracotta text-cream hover:opacity-90 shadow-md',
        slate: 'bg-slate text-cream hover:opacity-90 shadow-md',
        primary: 'bg-sage-700 text-cream hover:bg-sage-600 shadow-md',
        warm: 'bg-sage-500 text-ink hover:bg-sage-600 hover:text-cream shadow-md',
        danger: 'bg-destructive text-destructive-foreground hover:opacity-90 shadow-md',
        emergency: 'bg-[#D32F2F] text-white hover:bg-[#B71C1C] shadow-lg',
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm: 'h-9 px-4 text-sm',
        lg: 'h-12 px-8 text-base',
        xl: 'h-14 px-10 text-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'children'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children?: React.ReactNode;
  noAnimation?: boolean;
}

/**
 * UNIQUE "Living Button" Animation
 * - Magnetic cursor attraction
 * - Organic morphing border radius on hover
 * - Liquid ripple effect on click
 * - Warm glow pulse
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      noAnimation = false,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    
    // Magnetic effect values
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    
    // Smooth spring physics
    const springConfig = { damping: 25, stiffness: 400 };
    const xSpring = useSpring(x, springConfig);
    const ySpring = useSpring(y, springConfig);
    
    // Transform for 3D rotation
    const rotateX = useTransform(ySpring, [-20, 20], [5, -5]);
    const rotateY = useTransform(xSpring, [-20, 20], [-5, 5]);
    
    // Handle magnetic mouse movement
    const handleMouseMove = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled || noAnimation) return;
      const button = buttonRef.current;
      if (!button) return;
      
      const rect = button.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Magnetic pull - subtle attraction
      const deltaX = (e.clientX - centerX) * 0.15;
      const deltaY = (e.clientY - centerY) * 0.15;
      
      x.set(deltaX);
      y.set(deltaY);
    }, [isDisabled, noAnimation, x, y]);
    
    const handleMouseLeave = React.useCallback(() => {
      x.set(0);
      y.set(0);
    }, [x, y]);

    // Combine refs
    React.useImperativeHandle(ref, () => buttonRef.current as HTMLButtonElement);

    // For asChild, use Slot without motion
    if (asChild) {
      const { 
        onDrag, onDragStart, onDragEnd, onAnimationStart, onAnimationComplete,
        whileHover, whileTap, whileFocus, whileDrag, whileInView,
        animate, initial, exit, transition, variants,
        ...htmlProps 
      } = props as Record<string, unknown>;
      
      return (
        <Slot
          className={cn(
            buttonVariants({ variant, size, className }),
            fullWidth && 'w-full',
            'touch-target'
          )}
          ref={ref as React.Ref<HTMLElement>}
          {...(htmlProps as React.HTMLAttributes<HTMLElement>)}
        >
          {children as React.ReactElement}
        </Slot>
      );
    }

    return (
      <motion.button
        ref={buttonRef}
        className={cn(
          buttonVariants({ variant, size, className }),
          fullWidth && 'w-full',
          'touch-target relative overflow-hidden group'
        )}
        disabled={isDisabled}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          x: xSpring,
          y: ySpring,
          rotateX: !isDisabled && !noAnimation ? rotateX : 0,
          rotateY: !isDisabled && !noAnimation ? rotateY : 0,
          transformStyle: 'preserve-3d',
          willChange: 'transform',
          perspective: '1000px',
        }}
        whileHover={!isDisabled && !noAnimation ? { 
          scale: 1.02,
          borderRadius: '16px 8px 16px 8px', // Organic morph
        } : undefined}
        whileTap={!isDisabled && !noAnimation ? { 
          scale: 0.97,
          borderRadius: '8px 16px 8px 16px',
        } : undefined}
        transition={{ 
          type: 'spring', 
          stiffness: 400, 
          damping: 25,
        }}
        {...props}
      >
        {/* Liquid gradient overlay */}
        {!noAnimation && !isDisabled && (
          <motion.span
            className="absolute inset-0 opacity-0 group-hover:opacity-100"
            style={{
              background: 'radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.2) 0%, transparent 60%)',
              transition: 'opacity 0.3s ease',
            }}
          />
        )}
        
        {/* Warm pulse ring on hover */}
        {!noAnimation && !isDisabled && (
          <motion.span
            className="absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100"
            initial={false}
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(139, 154, 126, 0)',
                '0 0 0 4px rgba(139, 154, 126, 0.15)',
                '0 0 0 0 rgba(139, 154, 126, 0)',
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        {/* Shimmer trail */}
        {!noAnimation && !isDisabled && (
          <motion.span
            className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
            }}
          />
        )}
        
        {/* Content */}
        <span className="relative z-10 flex items-center gap-2">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="opacity-0">{children}</span>
            </>
          ) : (
            <>
              {leftIcon && <span className="[&_svg]:size-5">{leftIcon}</span>}
              <span>{children}</span>
              {rightIcon && <span className="[&_svg]:size-5">{rightIcon}</span>}
            </>
          )}
        </span>
      </motion.button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
