'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';

/**
 * Service Worker Provider
 *
 * Registers the service worker for PWA functionality and push notifications
 * Runs once on app mount
 */
export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Only register service worker in browser and production
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      process.env.NODE_ENV === 'development'
    ) {
      return;
    }

    const handleControllerChange = () => {
      console.log('[App] Service Worker updated, reloading page...');
      window.location.reload();
    };

    const handleMessage = (event: MessageEvent) => {
      console.log('[App] Message from Service Worker:', event.data);

      // Handle notification click navigation
      if (event.data.type === 'NOTIFICATION_CLICK') {
        const url = event.data.url;
        if (url) {
          window.location.href = url;
        }
      }

      // Handle offline sync trigger
      if (event.data.type === 'SYNC_OFFLINE_ACTIONS') {
        console.log('[App] Sync offline actions triggered');
        // Trigger any app-specific sync logic here
      }
    };

    // Register service worker
    navigator.serviceWorker
      .register('/sw.js', {
        scope: '/',
      })
      .then((registration) => {
        console.log('[App] Service Worker registered:', registration.scope);

        // Check for updates frequently so deploys propagate fast
        updateIntervalRef.current = setInterval(() => {
          registration.update();
        }, 5 * 60 * 1000); // Check every 5 minutes
      })
      .catch((error) => {
        console.error('[App] Service Worker registration failed:', error);
      });

    // Handle service worker updates
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      // Clean up interval
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      // Clean up event listeners
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  // Optionally: Auto-subscribe authenticated users to push notifications
  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') {
      return;
    }

    // Check if user has granted permission but not subscribed
    const checkSubscription = async () => {
      if (
        Notification.permission === 'granted' &&
        'serviceWorker' in navigator &&
        'PushManager' in window
      ) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();

          // If no subscription exists but permission is granted, this might be a returning user
          // They can manually enable it in settings
          if (!subscription) {
            console.log('[App] Push permission granted but not subscribed');
          }
        } catch (error) {
          console.error('[App] Failed to check push subscription:', error);
        }
      }
    };

    checkSubscription();
  }, [isAuthenticated]);

  return <>{children}</>;
}
