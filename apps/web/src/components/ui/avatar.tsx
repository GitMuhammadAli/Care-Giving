'use client';

import * as React from 'react';
import Image from 'next/image';
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

const sizePixels = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
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
          <Image
            src={src}
            alt={displayName}
            width={sizePixels[size]}
            height={sizePixels[size]}
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

// Additional components for Radix UI compatibility
const AvatarImage = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement> & { src?: string | null }
>(({ className, src, alt, ...props }, ref) => {
  if (!src) return null;
  return (
    <Image
      ref={ref as React.Ref<HTMLImageElement>}
      src={src}
      alt={alt || ''}
      width={40}
      height={40}
      className={cn('aspect-square h-full w-full rounded-full object-cover', className)}
      {...(props as any)}
    />
  );
});
AvatarImage.displayName = 'AvatarImage';

const AvatarFallback = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, children, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground font-medium',
      className
    )}
    {...props}
  >
    {children}
  </span>
));
AvatarFallback.displayName = 'AvatarFallback';

export { Avatar, AvatarImage, AvatarFallback };
