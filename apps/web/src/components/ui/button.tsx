'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion, HTMLMotionProps } from 'framer-motion';
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

    // Optimized motion button - smooth GPU-accelerated transforms
    return (
      <motion.button
        className={cn(
          buttonVariants({ variant, size, className }),
          fullWidth && 'w-full',
          'touch-target relative overflow-hidden'
        )}
        ref={ref}
        disabled={isDisabled}
        style={{
          willChange: 'transform',
          backfaceVisibility: 'hidden',
        }}
        whileHover={!isDisabled && !noAnimation ? { 
          scale: 1.02, 
          y: -1,
        } : undefined}
        whileTap={!isDisabled && !noAnimation ? { 
          scale: 0.98,
        } : undefined}
        transition={{ 
          type: 'spring', 
          stiffness: 500, 
          damping: 30,
          mass: 0.5,
        }}
        {...props}
      >
        {/* Simple shine effect */}
        {!noAnimation && !isDisabled && (
          <motion.span
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            initial={{ x: '-100%' }}
            whileHover={{ x: '100%' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{ willChange: 'transform' }}
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
