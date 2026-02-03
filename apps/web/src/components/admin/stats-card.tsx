'use client';

import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  iconColor?: string;
  className?: string;
}

export function StatsCard({
  title,
  value,
  change,
  changeLabel = 'vs last month',
  icon: Icon,
  iconColor = 'text-sage',
  className,
}: StatsCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div
      className={cn(
        'dashboard-card',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-editorial text-foreground">{value}</p>
        </div>
        {Icon && (
          <div className={cn('p-3 rounded-xl bg-sage-100', iconColor)}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
      {change !== undefined && (
        <div className="mt-4 flex items-center gap-2">
          {isPositive ? (
            <TrendingUp className="w-4 h-4 text-sage" />
          ) : (
            <TrendingDown className="w-4 h-4 text-destructive" />
          )}
          <span
            className={cn(
              'text-sm font-medium',
              isPositive ? 'text-sage' : 'text-destructive'
            )}
          >
            {isPositive ? '+' : ''}
            {change.toFixed(1)}%
          </span>
          <span className="text-sm text-muted-foreground">{changeLabel}</span>
        </div>
      )}
    </div>
  );
}

export default StatsCard;
