'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useAuth } from '@/hooks/use-auth';

interface NotificationContextValue {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextValue>({
  isSupported: false,
  permission: 'default',
  isSubscribed: false,
  isLoading: false,
  subscribe: async () => false,
  unsubscribe: async () => false,
});

export function useNotifications() {
  return useContext(NotificationContext);
}

interface Props {
  children: ReactNode;
}

export function NotificationProvider({ children }: Props) {
  const { isAuthenticated } = useAuth();
  const pushNotifications = usePushNotifications();
  const [hasPrompted, setHasPrompted] = useState(false);

  // Auto-prompt for notification permission after login
  useEffect(() => {
    if (
      isAuthenticated &&
      pushNotifications.isSupported &&
      pushNotifications.permission === 'default' &&
      !hasPrompted
    ) {
      // Wait a bit before prompting
      const timer = setTimeout(() => {
        setHasPrompted(true);
        // Don't auto-prompt - let user choose in settings
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, pushNotifications.isSupported, pushNotifications.permission, hasPrompted]);

  return (
    <NotificationContext.Provider value={pushNotifications}>
      {children}
    </NotificationContext.Provider>
  );
}

