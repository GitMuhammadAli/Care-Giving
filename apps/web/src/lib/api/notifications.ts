import { api } from './client';

export type NotificationType =
  | 'MEDICATION_REMINDER'
  | 'MEDICATION_MISSED'
  | 'APPOINTMENT_REMINDER'
  | 'SHIFT_REMINDER'
  | 'SHIFT_HANDOFF'
  | 'EMERGENCY_ALERT'
  | 'FAMILY_INVITE'
  | 'DOCUMENT_SHARED'
  | 'TIMELINE_UPDATE'
  | 'REFILL_NEEDED'
  | 'REFILL_ALERT'
  | 'GENERAL'
  // Admin action notifications
  | 'CARE_RECIPIENT_DELETED'
  | 'CARE_RECIPIENT_UPDATED'
  | 'MEDICATION_DELETED'
  | 'APPOINTMENT_DELETED'
  | 'FAMILY_MEMBER_REMOVED'
  | 'FAMILY_MEMBER_ROLE_CHANGED'
  | 'FAMILY_DELETED';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  read: boolean;
  data?: Record<string, any>;
  createdAt: string;
}

export interface PushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushSubscriptionRequest {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  platform?: 'web' | 'ios' | 'android';
  deviceName?: string;
}

export const notificationsApi = {
  // Get all notifications
  list: async (limit = 50, offset = 0, unreadOnly = false): Promise<Notification[]> => {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    if (unreadOnly) params.set('unreadOnly', 'true');
    return api.get<Notification[]>(`/notifications?${params.toString()}`);
  },

  // Get unread notifications (uses list with filter)
  getUnread: async (): Promise<Notification[]> => {
    return notificationsApi.list(50, 0, true);
  },

  // Get unread count
  getUnreadCount: async (): Promise<{ count: number }> => {
    return api.get<{ count: number }>('/notifications/unread/count');
  },

  // Mark single notification as read
  markAsRead: async (notificationId: string): Promise<void> => {
    await api.patch(`/notifications/${notificationId}/read`);
  },

  // Mark multiple notifications as read (calls single endpoint for each)
  markMultipleAsRead: async (ids: string[]): Promise<void> => {
    await Promise.all(ids.map((id) => notificationsApi.markAsRead(id)));
  },

  // Mark all as read
  markAllAsRead: async (): Promise<void> => {
    await api.patch('/notifications/read/all');
  },

  // Subscribe to push notifications
  subscribeToPush: async (subscription: PushSubscriptionRequest): Promise<void> => {
    await api.post('/notifications/push-token', subscription);
  },

  // Unsubscribe from push notifications
  unsubscribeFromPush: async (endpoint: string): Promise<void> => {
    await api.delete('/notifications/push-token', { body: JSON.stringify({ endpoint }) });
  },

  // Get VAPID public key
  getVapidPublicKey: (): string => {
    return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  },
};
