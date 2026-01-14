'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'highlighted' | 'urgent' | 'success';
  padding?: 'none' | 'compact' | 'default' | 'spacious';
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-card border border-border shadow-sm',
      interactive: `
        bg-card border border-border shadow-sm
        hover:shadow-md hover:-translate-y-0.5
        active:shadow-sm active:translate-y-0
        cursor-pointer transition-all duration-200
      `,
      highlighted: 'bg-card border border-border shadow-sm border-l-4 border-l-secondary',
      urgent: 'bg-destructive/10 border border-destructive/20 shadow-sm border-l-4 border-l-destructive',
      success: 'bg-primary/10 border border-primary/20 shadow-sm border-l-4 border-l-primary',
    };

    const paddings = {
      none: 'p-0',
      compact: 'p-4',
      default: 'p-5',
      spacious: 'p-6',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg text-card-foreground',
          variants[variant],
          paddings[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
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
