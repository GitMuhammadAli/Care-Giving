'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion, HTMLMotionProps, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-body text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-sage-700 text-cream hover:bg-sage-600 shadow-md',
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
        emergency: 'bg-[#D32F2F] text-white hover:bg-[#B71C1C] shadow-lg animate-pulse-emergency disabled:animate-none',
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

// Unique "Care Embrace" ripple effect
function EmbraceRipple({ isHovered }: { isHovered: boolean }) {
  return (
    <>
      {/* Expanding embrace circles */}
      <motion.span
        className="absolute inset-0 rounded-[inherit] border-2 border-white/20"
        initial={{ scale: 1, opacity: 0 }}
        animate={isHovered ? {
          scale: [1, 1.15],
          opacity: [0, 0.5, 0],
        } : { scale: 1, opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
      <motion.span
        className="absolute inset-0 rounded-[inherit] border border-white/10"
        initial={{ scale: 1, opacity: 0 }}
        animate={isHovered ? {
          scale: [1, 1.25],
          opacity: [0, 0.3, 0],
        } : { scale: 1, opacity: 0 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
      />
      {/* Warm glow */}
      <motion.span
        className="absolute inset-0 rounded-[inherit]"
        initial={{ opacity: 0 }}
        animate={isHovered ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          boxShadow: '0 0 20px rgba(139, 154, 126, 0.4), 0 0 40px rgba(139, 154, 126, 0.2)',
        }}
      />
    </>
  );
}

// Unique flowing gradient on hover
function FlowingGradient({ isHovered }: { isHovered: boolean }) {
  return (
    <motion.span
      className="absolute inset-0 rounded-[inherit] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: isHovered ? 1 : 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.span
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
        }}
        animate={isHovered ? {
          x: ['-100%', '200%'],
        } : {}}
        transition={{
          duration: 1,
          ease: "easeInOut",
          repeat: Infinity,
          repeatDelay: 0.5,
        }}
      />
    </motion.span>
  );
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
    const [isHovered, setIsHovered] = React.useState(false);
    const [isPressed, setIsPressed] = React.useState(false);
    const isDisabled = disabled || isLoading;

    // 3D tilt effect
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useSpring(useTransform(y, [-50, 50], [5, -5]), { stiffness: 300, damping: 30 });
    const rotateY = useSpring(useTransform(x, [-50, 50], [-5, 5]), { stiffness: 300, damping: 30 });

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (noAnimation || isDisabled) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      x.set(e.clientX - centerX);
      y.set(e.clientY - centerY);
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
      x.set(0);
      y.set(0);
    };

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
        className={cn(
          buttonVariants({ variant, size, className }),
          fullWidth && 'w-full',
          'touch-target relative overflow-visible'
        )}
        ref={ref}
        disabled={isDisabled}
        onMouseEnter={() => !isDisabled && setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        style={{
          rotateX: noAnimation ? 0 : rotateX,
          rotateY: noAnimation ? 0 : rotateY,
          transformStyle: 'preserve-3d',
        }}
        animate={{
          scale: isPressed ? 0.97 : isHovered ? 1.02 : 1,
          y: isHovered ? -2 : 0,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        {...props}
      >
        {/* Embrace ripple effect */}
        {!noAnimation && <EmbraceRipple isHovered={isHovered} />}
        
        {/* Flowing gradient */}
        {!noAnimation && <FlowingGradient isHovered={isHovered} />}
        
        {/* Content */}
        <span className="relative z-10 flex items-center gap-2">
          {isLoading ? (
            <>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="w-4 h-4" />
              </motion.span>
              <span className="opacity-0">{children}</span>
            </>
          ) : (
            <>
              {leftIcon && (
                <motion.span 
                  className="[&_svg]:size-5"
                  animate={{ x: isHovered ? -3 : 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  {leftIcon}
                </motion.span>
              )}
              <span>{children}</span>
              {rightIcon && (
                <motion.span 
                  className="[&_svg]:size-5"
                  animate={{ x: isHovered ? 3 : 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  {rightIcon}
                </motion.span>
              )}
            </>
          )}
        </span>
      </motion.button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
