'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellOff, Check, X, AlertCircle, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';

export interface NotificationSettingsProps {
  className?: string;
  showDescription?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function NotificationSettings({
  className,
  showDescription = true,
  size = 'md',
}: NotificationSettingsProps) {
  const {
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    isSupported,
  } = usePushNotifications();

  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  // Not supported in this browser
  if (!isSupported) {
    return (
      <Card className={cn('p-4', className)}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-bg-muted flex items-center justify-center flex-shrink-0">
            <BellOff className="w-5 h-5 text-text-tertiary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-text-primary">Push Notifications</h3>
            <p className="text-sm text-text-secondary mt-1">
              Push notifications are not supported in your browser
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Permission denied
  if (permission === 'denied') {
    return (
      <Card className={cn('p-4 border-l-4 border-l-error', className)}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-error-light flex items-center justify-center flex-shrink-0">
            <X className="w-5 h-5 text-error" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-text-primary">Notifications Blocked</h3>
            <p className="text-sm text-text-secondary mt-1">
              You've blocked notifications for this site. To enable them:
            </p>
            <ul className="text-sm text-text-secondary mt-2 space-y-1 list-disc list-inside">
              <li>Click the lock icon in your browser's address bar</li>
              <li>Find the Notifications setting</li>
              <li>Change it to "Allow"</li>
              <li>Reload this page</li>
            </ul>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className={cn('p-4', size === 'sm' && 'p-3', size === 'lg' && 'p-6')}>
        <div className="flex items-start gap-4">
          {/* Icon */}
          <motion.div
            animate={{
              scale: isSubscribed ? [1, 1.1, 1] : 1,
            }}
            transition={{ duration: 0.3 }}
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
              isSubscribed
                ? 'bg-success-light'
                : permission === 'granted'
                ? 'bg-accent-primary-light'
                : 'bg-bg-muted'
            )}
          >
            {isSubscribed ? (
              <Bell className="w-6 h-6 text-success" />
            ) : (
              <BellOff className="w-6 h-6 text-text-tertiary" />
            )}
          </motion.div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className={cn('font-semibold text-text-primary', size === 'sm' && 'text-sm')}>
                  Push Notifications
                </h3>
                <p
                  className={cn(
                    'text-text-secondary mt-0.5',
                    size === 'sm' ? 'text-xs' : 'text-sm'
                  )}
                >
                  {isSubscribed ? 'Enabled' : 'Disabled'}
                </p>
              </div>

              {/* Toggle */}
              <button
                onClick={handleToggle}
                disabled={isLoading}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2',
                  isSubscribed ? 'bg-success' : 'bg-bg-muted',
                  isLoading && 'opacity-50 cursor-not-allowed'
                )}
              >
                <motion.span
                  layout
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    isSubscribed ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            {/* Status badge */}
            {isSubscribed && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-light text-success text-xs font-medium"
              >
                <Check className="w-3 h-3" />
                Receiving notifications
              </motion.div>
            )}

            {/* Description */}
            {showDescription && (
              <div className="mt-3">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-sm text-accent-primary hover:text-accent-primary-dark transition-colors flex items-center gap-1"
                >
                  <Info className="w-4 h-4" />
                  {isExpanded ? 'Show less' : 'Learn more'}
                </button>

                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-3 p-3 rounded-lg bg-accent-primary-light/30 border border-accent-primary/20"
                  >
                    <h4 className="text-sm font-medium text-text-primary mb-2">
                      Get notified about:
                    </h4>
                    <ul className="text-sm text-text-secondary space-y-1.5">
                      <li className="flex items-start gap-2">
                        <span className="text-accent-primary mt-0.5">💊</span>
                        <span>Medication reminders and schedules</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-accent-primary mt-0.5">📅</span>
                        <span>Upcoming appointments and events</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-accent-primary mt-0.5">🚨</span>
                        <span>Emergency alerts from family members</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-accent-primary mt-0.5">👥</span>
                        <span>Family updates and messages</span>
                      </li>
                    </ul>

                    <div className="mt-3 p-2 rounded bg-white/50 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-text-tertiary mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-text-secondary">
                        Notifications work even when the app is closed. You can customize what you
                        receive in your notification preferences.
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* First-time setup CTA */}
        {!isSubscribed && permission === 'default' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 rounded-xl bg-accent-warm-light border border-accent-warm/20"
          >
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-accent-warm mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">
                  Never miss important care updates
                </p>
                <p className="text-sm text-text-secondary mt-1">
                  Enable push notifications to stay informed about medications, appointments, and
                  emergencies.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleToggle}
                  disabled={isLoading}
                  className="mt-3"
                  leftIcon={<Bell className="w-4 h-4" />}
                >
                  {isLoading ? 'Enabling...' : 'Enable Notifications'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </Card>
  );
}
