'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  requestNotificationPermission,
  getNotificationPermissionStatus,
} from '@/lib/push-notifications';
import { toast } from 'react-hot-toast';
import { useEffect, useState } from 'react';

/**
 * Hook to get all notifications
 */
export function useNotifications(limit = 50, offset = 0) {
  return useQuery({
    queryKey: ['notifications', limit, offset],
    queryFn: () => notificationsApi.list(limit, offset),
  });
}

/**
 * Hook to get unread notifications
 */
export function useUnreadNotifications() {
  return useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => notificationsApi.getUnread(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Hook to get unread notification count
 */
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['notifications', 'unread', 'count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Hook to mark notifications as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => notificationsApi.markMultipleAsRead(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to mark notifications as read');
    },
  });
}

/**
 * Hook to mark all notifications as read
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to mark all as read');
    },
  });
}

/**
 * Hook to manage push notification subscription
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check initial permission status
  useEffect(() => {
    const checkPermission = async () => {
      const status = await getNotificationPermissionStatus();
      setPermission(status);

      // Check if already subscribed
      if (status === 'granted' && 'serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
        } catch (error) {
          console.error('Failed to check subscription status:', error);
        }
      }
    };

    checkPermission();
  }, []);

  const subscribe = async () => {
    setIsLoading(true);
    try {
      const subscription = await subscribeToPushNotifications();
      if (subscription) {
        setIsSubscribed(true);
        setPermission('granted');
        toast.success('Push notifications enabled!');
        return true;
      } else {
        toast.error('Failed to enable push notifications');
        return false;
      }
    } catch (error) {
      console.error('Failed to subscribe:', error);
      toast.error('Failed to enable push notifications');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    setIsLoading(true);
    try {
      const success = await unsubscribeFromPushNotifications();
      if (success) {
        setIsSubscribed(false);
        toast.success('Push notifications disabled');
        return true;
      } else {
        toast.error('Failed to disable push notifications');
        return false;
      }
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      toast.error('Failed to disable push notifications');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const requestPermissionOnly = async () => {
    setIsLoading(true);
    try {
      const hasPermission = await requestNotificationPermission();
      const status = await getNotificationPermissionStatus();
      setPermission(status);

      if (!hasPermission) {
        toast.error('Notification permission denied');
      }

      return hasPermission;
    } catch (error) {
      console.error('Failed to request permission:', error);
      toast.error('Failed to request notification permission');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    requestPermission: requestPermissionOnly,
    isSupported: typeof window !== 'undefined' && 'Notification' in window,
  };
}

/**
 * Hook to listen for service worker messages
 */
export function useServiceWorkerMessages(callback: (data: any) => void) {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const messageHandler = (event: MessageEvent) => {
      callback(event.data);
    };

    navigator.serviceWorker.addEventListener('message', messageHandler);

    return () => {
      navigator.serviceWorker.removeEventListener('message', messageHandler);
    };
  }, [callback]);
}
