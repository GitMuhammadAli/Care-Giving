'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getNotificationPermissionStatus,
} from '@/lib/push-notifications';
import { useAuth } from './use-auth';

export function usePushNotifications() {
  const { isAuthenticated } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'Notification' in window && 
                      'serviceWorker' in navigator && 
                      'PushManager' in window;
    setIsSupported(supported);

    if (supported) {
      getNotificationPermissionStatus().then(setPermission);
      
      // Check if already subscribed
      navigator.serviceWorker.ready.then(async (registration) => {
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      });
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!isAuthenticated) {
      console.warn('Must be authenticated to subscribe to push notifications');
      return false;
    }

    setIsLoading(true);
    try {
      const subscription = await subscribeToPushNotifications();
      if (subscription) {
        setIsSubscribed(true);
        setPermission('granted');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to subscribe:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const success = await unsubscribeFromPushNotifications();
      if (success) {
        setIsSubscribed(false);
      }
      return success;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    const granted = await requestNotificationPermission();
    setPermission(granted ? 'granted' : 'denied');
    return granted;
  }, []);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    requestPermission,
  };
}

