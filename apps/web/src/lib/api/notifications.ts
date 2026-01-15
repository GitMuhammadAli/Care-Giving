import { api } from './client';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'MEDICATION_REMINDER' | 'APPOINTMENT_REMINDER' | 'EMERGENCY_ALERT' | 'FAMILY_UPDATE' | 'SYSTEM';
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
  list: async (limit = 50, offset = 0): Promise<Notification[]> => {
    return api.get<Notification[]>(`/notifications?limit=${limit}&offset=${offset}`);
  },

  // Get unread notifications
  getUnread: async (): Promise<Notification[]> => {
    return api.get<Notification[]>('/notifications/unread');
  },

  // Get unread count
  getUnreadCount: async (): Promise<{ count: number }> => {
    return api.get<{ count: number }>('/notifications/unread/count');
  },

  // Mark notifications as read
  markAsRead: async (ids: string[]): Promise<void> => {
    await api.patch('/notifications/read', { ids });
  },

  // Mark all as read
  markAllAsRead: async (): Promise<void> => {
    await api.patch('/notifications/read/all');
  },

  // Subscribe to push notifications
  subscribeToPush: async (subscription: PushSubscriptionRequest): Promise<void> => {
    await api.post('/notifications/push-subscription', subscription);
  },

  // Unsubscribe from push notifications
  unsubscribeFromPush: async (endpoint: string): Promise<void> => {
    await api.delete('/notifications/push-subscription', { body: JSON.stringify({ endpoint }) });
  },

  // Get VAPID public key
  getVapidPublicKey: (): string => {
    return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  },
};
