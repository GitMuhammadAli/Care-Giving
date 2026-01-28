'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useAuth } from '@/hooks/use-auth';
import { NotificationPermissionPopup } from '@/components/notifications/notification-permission-popup';

const DISMISSED_KEY = 'care-circle-notification-prompt-dismissed';
const PROMPT_DELAY_MS = 3000; // Wait 3 seconds after page load

interface NotificationContextValue {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  showPermissionPrompt: () => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  isSupported: false,
  permission: 'default',
  isSubscribed: false,
  isLoading: false,
  subscribe: async () => false,
  unsubscribe: async () => false,
  showPermissionPrompt: () => {},
});

export function useNotifications() {
  return useContext(NotificationContext);
}

interface Props {
  children: ReactNode;
}

export function NotificationProvider({ children }: Props) {
  const { isAuthenticated, sessionChecked } = useAuth();
  const pushNotifications = usePushNotifications();
  const [showPopup, setShowPopup] = useState(false);
  const [hasCheckedPrompt, setHasCheckedPrompt] = useState(false);

  // Check if we should show the prompt
  useEffect(() => {
    if (!sessionChecked || !isAuthenticated || hasCheckedPrompt) {
      return;
    }

    // Don't show if not supported
    if (!pushNotifications.isSupported) {
      setHasCheckedPrompt(true);
      return;
    }

    // Don't show if already granted or denied
    if (pushNotifications.permission !== 'default') {
      setHasCheckedPrompt(true);
      return;
    }

    // Check if user has dismissed the prompt before
    const isDismissed = localStorage.getItem(DISMISSED_KEY);
    if (isDismissed) {
      // Check if enough time has passed (7 days) to show again
      const dismissedAt = parseInt(isDismissed, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedAt < sevenDays) {
        setHasCheckedPrompt(true);
        return;
      }
    }

    // Wait before showing the prompt
    const timer = setTimeout(() => {
      setShowPopup(true);
      setHasCheckedPrompt(true);
    }, PROMPT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [
    sessionChecked, 
    isAuthenticated, 
    pushNotifications.isSupported, 
    pushNotifications.permission,
    hasCheckedPrompt
  ]);

  const handleClosePopup = useCallback(() => {
    setShowPopup(false);
    // Remember that user dismissed the prompt
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
  }, []);

  const handleEnableNotifications = useCallback(async () => {
    const success = await pushNotifications.subscribe();
    if (success) {
      // Clear the dismissed flag on success
      localStorage.removeItem(DISMISSED_KEY);
    }
    return success;
  }, [pushNotifications]);

  const showPermissionPrompt = useCallback(() => {
    if (pushNotifications.isSupported && pushNotifications.permission === 'default') {
      setShowPopup(true);
    }
  }, [pushNotifications.isSupported, pushNotifications.permission]);

  const contextValue: NotificationContextValue = {
    ...pushNotifications,
    showPermissionPrompt,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <NotificationPermissionPopup
        isOpen={showPopup}
        onClose={handleClosePopup}
        onEnable={handleEnableNotifications}
        isLoading={pushNotifications.isLoading}
      />
    </NotificationContext.Provider>
  );
}
