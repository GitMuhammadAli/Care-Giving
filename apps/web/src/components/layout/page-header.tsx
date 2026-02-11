'use client';

import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Bell } from 'lucide-react';

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  showGreeting?: boolean;
  userName?: string;
  userAvatar?: string;
  showNotifications?: boolean;
  unreadCount?: number;
  actions?: React.ReactNode;
  className?: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function PageHeader({
  title,
  subtitle,
  showGreeting = false,
  userName,
  userAvatar,
  showNotifications = true,
  unreadCount = 0,
  actions,
  className,
}: PageHeaderProps) {
  const greeting = showGreeting && userName ? `${getGreeting()}, ${userName.split(' ')[0]}` : undefined;
  const dateString = formatDate(new Date());

  return (
    <header
      className={cn(
        'sticky top-0 z-30 bg-background/80 backdrop-blur-md',
        'px-4 sm:px-6 py-4 border-b border-border',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex-1 min-w-0">
          {greeting ? (
            <>
              <h1 className="font-serif text-xl sm:text-2xl md:text-3xl text-foreground truncate">
                {greeting}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">{dateString}</p>
            </>
          ) : title ? (
            <>
              <h1 className="font-serif text-xl sm:text-2xl md:text-3xl text-foreground truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{subtitle}</p>
              )}
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {actions}

          {showNotifications && (
            <button
              className={cn(
                'relative flex items-center justify-center',
                'w-11 h-11 rounded-xl',
                'bg-card border border-border',
                'text-muted-foreground hover:text-foreground hover:border-muted-foreground/50',
                'transition-colors duration-150 touch-target'
              )}
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span
                  className={cn(
                    'absolute -top-1 -right-1',
                    'min-w-[20px] h-5 px-1.5',
                    'bg-destructive text-white text-xs font-semibold',
                    'rounded-full flex items-center justify-center'
                  )}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          )}

          {userName && (
            <Avatar
              name={userName}
              src={userAvatar}
              size="md"
              className="hidden sm:block"
            />
          )}
        </div>
      </div>
    </header>
  );
}
