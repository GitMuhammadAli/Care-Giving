'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string | null;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  status?: 'online' | 'offline' | 'away';
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

const statusSizeClasses = {
  sm: 'w-2 h-2 border',
  md: 'w-2.5 h-2.5 border-2',
  lg: 'w-3 h-3 border-2',
  xl: 'w-4 h-4 border-2',
};

const statusColors = {
  online: 'bg-sage',
  offline: 'bg-muted-foreground',
  away: 'bg-terracotta',
};

function getInitials(name?: string | null): string {
  if (!name || name.trim() === '') {
    return '?';
  }
  return name
    .trim()
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name?: string | null): string {
  const colors = [
    'bg-sage/30 text-sage',
    'bg-terracotta/30 text-terracotta',
    'bg-slate/30 text-slate',
    'bg-muted text-muted-foreground',
  ];
  if (!name || name.trim() === '') {
    return colors[0]; // Default to first color
  }
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, name, src, size = 'md', showStatus, status = 'offline', ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false);
    const displayName = name || 'User';
    const initials = getInitials(name);
    const avatarColor = getAvatarColor(name);

    return (
      <div ref={ref} className={cn('relative inline-flex', className)} {...props}>
        {src && !imageError ? (
          <img
            src={src}
            alt={displayName}
            className={cn(
              'rounded-full object-cover',
              sizeClasses[size]
            )}
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            className={cn(
              'rounded-full flex items-center justify-center font-medium',
              sizeClasses[size],
              avatarColor
            )}
          >
            {initials}
          </div>
        )}
        {showStatus && (
          <span
            className={cn(
              'absolute bottom-0 right-0 rounded-full border-background',
              statusSizeClasses[size],
              statusColors[status]
            )}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

export { Avatar };
