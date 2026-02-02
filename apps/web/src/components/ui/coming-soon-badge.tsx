'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Clock, Sparkles, FlaskConical } from 'lucide-react';

interface ComingSoonBadgeProps {
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'subtle' | 'outline';
  showIcon?: boolean;
}

export function ComingSoonBadge({
  className,
  size = 'default',
  variant = 'default',
  showIcon = true,
}: ComingSoonBadgeProps) {
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px] gap-1',
    default: 'px-2 py-0.5 text-xs gap-1.5',
    lg: 'px-3 py-1 text-sm gap-2',
  };

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    default: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const variantClasses = {
    default: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30',
    subtle: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-transparent',
    outline: 'bg-transparent text-amber-600 dark:text-amber-400 border-amber-500/50',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium whitespace-nowrap',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      {showIcon && <Clock className={iconSizes[size]} />}
      Coming Soon
    </span>
  );
}

interface BetaBadgeProps {
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'subtle' | 'outline';
  showIcon?: boolean;
}

export function BetaBadge({
  className,
  size = 'default',
  variant = 'default',
  showIcon = true,
}: BetaBadgeProps) {
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px] gap-1',
    default: 'px-2 py-0.5 text-xs gap-1.5',
    lg: 'px-3 py-1 text-sm gap-2',
  };

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    default: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const variantClasses = {
    default: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30',
    subtle: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-transparent',
    outline: 'bg-transparent text-purple-600 dark:text-purple-400 border-purple-500/50',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium whitespace-nowrap',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      {showIcon && <FlaskConical className={iconSizes[size]} />}
      Beta
    </span>
  );
}

interface EarlyAccessBadgeProps {
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'subtle' | 'outline';
  showIcon?: boolean;
}

export function EarlyAccessBadge({
  className,
  size = 'default',
  variant = 'default',
  showIcon = true,
}: EarlyAccessBadgeProps) {
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px] gap-1',
    default: 'px-2 py-0.5 text-xs gap-1.5',
    lg: 'px-3 py-1 text-sm gap-2',
  };

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    default: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const variantClasses = {
    default: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    subtle: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-transparent',
    outline: 'bg-transparent text-emerald-600 dark:text-emerald-400 border-emerald-500/50',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium whitespace-nowrap',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      {showIcon && <Sparkles className={iconSizes[size]} />}
      Early Access
    </span>
  );
}

