'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  Pill,
  Calendar,
  AlertTriangle,
  Users,
  Info,
  Trash2,
  UserMinus,
  UserCog,
  Heart,
  Edit,
  Clock,
  FileText,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification, NotificationType } from '@/lib/api/notifications';

interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead?: (ids: string[]) => void;
  onNotificationClick?: (notification: Notification) => void;
  className?: string;
  emptyMessage?: string;
}

const notificationIcons: Record<NotificationType, React.ElementType> = {
  MEDICATION_REMINDER: Pill,
  MEDICATION_MISSED: Pill,
  APPOINTMENT_REMINDER: Calendar,
  SHIFT_REMINDER: Clock,
  SHIFT_HANDOFF: Users,
  EMERGENCY_ALERT: AlertTriangle,
  FAMILY_INVITE: Users,
  DOCUMENT_SHARED: FileText,
  TIMELINE_UPDATE: Activity,
  REFILL_NEEDED: Pill,
  REFILL_ALERT: Pill,
  GENERAL: Info,
  CARE_RECIPIENT_DELETED: Trash2,
  CARE_RECIPIENT_UPDATED: Edit,
  MEDICATION_DELETED: Pill,
  APPOINTMENT_DELETED: Calendar,
  FAMILY_MEMBER_REMOVED: UserMinus,
  FAMILY_MEMBER_ROLE_CHANGED: UserCog,
  FAMILY_DELETED: Trash2,
};

const notificationColors: Record<NotificationType, string> = {
  MEDICATION_REMINDER: 'bg-blue-100 text-blue-600',
  MEDICATION_MISSED: 'bg-orange-100 text-orange-600',
  APPOINTMENT_REMINDER: 'bg-purple-100 text-purple-600',
  SHIFT_REMINDER: 'bg-cyan-100 text-cyan-600',
  SHIFT_HANDOFF: 'bg-teal-100 text-teal-600',
  EMERGENCY_ALERT: 'bg-red-100 text-red-600',
  FAMILY_INVITE: 'bg-green-100 text-green-600',
  DOCUMENT_SHARED: 'bg-blue-100 text-blue-600',
  TIMELINE_UPDATE: 'bg-purple-100 text-purple-600',
  REFILL_NEEDED: 'bg-yellow-100 text-yellow-600',
  REFILL_ALERT: 'bg-orange-100 text-orange-600',
  GENERAL: 'bg-gray-100 text-gray-600',
  CARE_RECIPIENT_DELETED: 'bg-red-100 text-red-600',
  CARE_RECIPIENT_UPDATED: 'bg-yellow-100 text-yellow-600',
  MEDICATION_DELETED: 'bg-red-100 text-red-600',
  APPOINTMENT_DELETED: 'bg-red-100 text-red-600',
  FAMILY_MEMBER_REMOVED: 'bg-orange-100 text-orange-600',
  FAMILY_MEMBER_ROLE_CHANGED: 'bg-indigo-100 text-indigo-600',
  FAMILY_DELETED: 'bg-red-100 text-red-600',
};

export function NotificationList({
  notifications,
  onMarkAsRead,
  onNotificationClick,
  className,
  emptyMessage = 'No notifications',
}: NotificationListProps) {
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read && onMarkAsRead) {
      onMarkAsRead([notification.id]);
    }
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
  };

  if (notifications.length === 0) {
    return (
      <div className={cn('py-8 text-center', className)}>
        <Info className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('divide-y divide-border', className)}>
      {notifications.map((notification) => {
        const Icon = notificationIcons[notification.type] || Info;
        const colorClass = notificationColors[notification.type] || 'bg-gray-100 text-gray-600';

        return (
          <button
            key={notification.id}
            onClick={() => handleNotificationClick(notification)}
            className={cn(
              'w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors flex gap-3',
              !notification.read && 'bg-accent/30'
            )}
          >
            {/* Icon */}
            <div
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
                colorClass
              )}
            >
              <Icon className="w-4 h-4" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'text-sm line-clamp-2',
                  !notification.read ? 'font-semibold text-foreground' : 'text-foreground'
                )}
              >
                {notification.title}
              </p>
              {notification.body && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {notification.body}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
              </p>
            </div>

            {/* Unread indicator */}
            {!notification.read && (
              <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
            )}
          </button>
        );
      })}
    </div>
  );
}
