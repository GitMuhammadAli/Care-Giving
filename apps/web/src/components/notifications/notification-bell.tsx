'use client';

import * as React from 'react';
import { Bell, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationList } from './notification-list';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkAsRead,
  useMarkAllAsRead,
} from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';
import type { Notification } from '@/lib/api/notifications';

interface NotificationBellProps {
  className?: string;
  onNotificationClick?: (notification: Notification) => void;
}

export function NotificationBell({ className, onNotificationClick }: NotificationBellProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const { data: notifications = [], isLoading } = useNotifications(20);
  const { data: unreadData } = useUnreadNotificationCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const unreadCount = unreadData?.count || 0;

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = (ids: string[]) => {
    markAsRead.mutate(ids);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };

  const handleNotificationClick = (notification: Notification) => {
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    setIsOpen(false);
  };

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Bell Button */}
      <Button
        variant="ghost"
        size="icon"
        className="relative rounded-xl h-9 w-9"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-destructive rounded-full text-[10px] flex items-center justify-center text-destructive-foreground font-semibold px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-fade">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-accent/30">
            <h3 className="font-serif text-lg text-primary font-bold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={markAllAsRead.isPending}
                className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 disabled:opacity-50"
              >
                {markAllAsRead.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
                Mark all read
              </button>
            )}
          </div>

          {/* Content */}
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="py-8 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <NotificationList
                notifications={notifications}
                onMarkAsRead={handleMarkAsRead}
                onNotificationClick={handleNotificationClick}
                emptyMessage="No new notifications"
              />
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-border bg-accent/20">
              <a
                href="/notifications"
                className="text-xs text-primary hover:text-primary/80 font-medium"
                onClick={() => setIsOpen(false)}
              >
                View all notifications
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
