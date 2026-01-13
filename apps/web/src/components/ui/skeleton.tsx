'use client';

import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
  style,
  ...props
}: SkeletonProps) {
  const variants = {
    text: 'rounded-md',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={cn('skeleton', variants[variant], className)}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-xl p-5">
      <div className="flex items-start gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton height={20} width="60%" />
          <Skeleton height={16} width="40%" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton height={16} />
        <Skeleton height={16} width="80%" />
      </div>
    </div>
  );
}

export function SkeletonMedicationCard() {
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton variant="rectangular" width={40} height={40} className="rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton height={18} width={120} />
            <Skeleton height={14} width={80} />
          </div>
        </div>
        <Skeleton height={14} width={60} />
      </div>
      <div className="flex gap-2 mt-4">
        <Skeleton height={44} className="flex-1" />
        <Skeleton height={44} className="flex-1" />
      </div>
    </div>
  );
}

export function SkeletonTimeline() {
  return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton variant="rectangular" width={40} height={40} className="rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton height={18} width={140} />
              <Skeleton height={14} width={60} />
            </div>
            <Skeleton height={14} width="70%" />
          </div>
        </div>
      ))}
    </div>
  );
}

