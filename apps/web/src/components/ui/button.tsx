'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-body text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-foreground text-background hover:bg-foreground/90 shadow-sm',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-foreground/20 bg-transparent text-foreground hover:bg-foreground/5',
        secondary: 'bg-muted text-foreground hover:bg-muted/80',
        ghost: 'hover:bg-foreground/5 hover:text-foreground',
        link: 'text-foreground underline-offset-4 hover:underline',
        // Pixel-perfect editorial variants
        editorial: 'bg-sage text-foreground hover:bg-sage/80 tracking-caps uppercase text-xs font-semibold',
        'editorial-outline': 'border border-foreground/20 bg-transparent text-foreground hover:border-foreground/40 tracking-caps uppercase text-xs font-medium',
        sage: 'bg-sage text-foreground hover:bg-sage/80 shadow-sm hover:shadow-sage-glow',
        terracotta: 'bg-terracotta text-foreground hover:bg-terracotta/80 shadow-sm hover:shadow-warm-glow',
        slate: 'bg-slate text-cream hover:bg-slate/80',
        // Legacy variants for backward compatibility
        primary: 'bg-primary text-foreground hover:bg-primary/80 shadow-sm hover:shadow-md',
        warm: 'bg-terracotta text-foreground hover:bg-terracotta/80 shadow-sm hover:shadow-warm-glow',
        danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        emergency: 'bg-emergency text-white hover:bg-emergency-dark shadow-lg animate-pulse-emergency disabled:animate-none',
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
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
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
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    const isDisabled = disabled || isLoading;

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          fullWidth && 'w-full',
          'touch-target'
        )}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin" />
            <span className="opacity-0">{children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="[&_svg]:size-5">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="[&_svg]:size-5">{rightIcon}</span>}
          </>
        )}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
