'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-body text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]',
  {
    variants: {
      variant: {
        // Primary sage-700 buttons
        default: 'bg-sage-700 text-cream hover:bg-sage-600 shadow-md hover:shadow-lg',
        // Destructive red
        destructive: 'bg-destructive text-destructive-foreground hover:opacity-90 shadow-md hover:shadow-lg',
        // Outline sage
        outline: 'border-2 border-sage-700 bg-transparent text-sage-700 hover:bg-sage-50 font-semibold',
        // Secondary sage-light
        secondary: 'bg-sage-500 text-ink hover:bg-sage-600 hover:text-cream shadow-md hover:shadow-lg',
        // Ghost sage-light
        ghost: 'text-sage-700 hover:bg-sage-50 font-semibold',
        // Link sage
        link: 'text-sage-700 underline-offset-4 hover:underline font-semibold',
        // Editorial variants
        editorial: 'bg-sage-700 text-cream hover:bg-sage-600 tracking-caps uppercase text-xs font-bold shadow-md',
        'editorial-outline': 'border-2 border-sage-700 bg-transparent text-sage-700 hover:bg-sage-50 tracking-caps uppercase text-xs font-bold',
        // Color variants
        sage: 'bg-sage-700 text-cream hover:bg-sage-600 shadow-md hover:shadow-lg',
        'sage-light': 'bg-sage-500 text-ink hover:bg-sage-600 shadow-md hover:shadow-lg',
        terracotta: 'bg-terracotta text-cream hover:opacity-90 shadow-md hover:shadow-lg',
        slate: 'bg-slate text-cream hover:opacity-90 shadow-md hover:shadow-lg',
        // Legacy variants for backward compatibility
        primary: 'bg-sage-700 text-cream hover:bg-sage-600 shadow-md hover:shadow-lg',
        warm: 'bg-sage-500 text-ink hover:bg-sage-600 hover:text-cream shadow-md hover:shadow-lg',
        danger: 'bg-destructive text-destructive-foreground hover:opacity-90 shadow-md hover:shadow-lg',
        emergency: 'bg-[#D32F2F] text-white hover:bg-[#B71C1C] shadow-lg hover:shadow-xl animate-pulse-emergency disabled:animate-none',
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
