'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellRing, X, Smartphone, Calendar, AlertTriangle, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NotificationPermissionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onEnable: () => Promise<boolean>;
  isLoading?: boolean;
}

const FEATURES = [
  {
    icon: AlertTriangle,
    title: 'Emergency Alerts',
    description: 'Instant notifications for critical situations',
    color: 'text-error',
  },
  {
    icon: Calendar,
    title: 'Medication Reminders',
    description: 'Never miss a dose or refill',
    color: 'text-primary',
  },
  {
    icon: MessageCircle,
    title: 'Family Messages',
    description: 'Stay connected with your care team',
    color: 'text-success',
  },
  {
    icon: Smartphone,
    title: 'Care Updates',
    description: 'Real-time updates on loved ones',
    color: 'text-warning',
  },
];

export function NotificationPermissionPopup({
  isOpen,
  onClose,
  onEnable,
  isLoading = false,
}: NotificationPermissionPopupProps) {
  const [animationStep, setAnimationStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setAnimationStep(0);
      const timer = setInterval(() => {
        setAnimationStep((prev) => (prev < FEATURES.length ? prev + 1 : prev));
      }, 150);
      return () => clearInterval(timer);
    }
  }, [isOpen]);

  const handleEnable = async () => {
    const success = await onEnable();
    if (success) {
      onClose();
    }
  };

  if (typeof window === 'undefined') return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-bg-inverse/50 backdrop-blur-md z-50"
            onClick={onClose}
          />

          {/* Popup */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ 
                type: 'spring', 
                damping: 25, 
                stiffness: 300,
                delay: 0.1 
              }}
              className={cn(
                'relative w-full max-w-md bg-bg-surface rounded-3xl shadow-2xl pointer-events-auto',
                'border border-border-subtle overflow-hidden'
              )}
            >
              {/* Animated background gradient */}
              <div className="absolute inset-0 overflow-hidden">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl"
                />
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.3 }}
                  transition={{ delay: 0.2 }}
                  className="absolute -bottom-20 -left-20 w-64 h-64 bg-gradient-to-tr from-success/20 to-primary/20 rounded-full blur-3xl"
                />
              </div>

              {/* Content */}
              <div className="relative">
                {/* Close button */}
                <button
                  onClick={onClose}
                  className={cn(
                    'absolute top-4 right-4 z-10',
                    'flex items-center justify-center w-9 h-9 rounded-full',
                    'text-text-tertiary hover:text-text-primary hover:bg-bg-muted/80',
                    'transition-colors'
                  )}
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Header with icon */}
                <div className="pt-8 pb-6 px-6 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 15, stiffness: 300, delay: 0.2 }}
                    className="relative mx-auto w-20 h-20 mb-5"
                  >
                    {/* Pulsing rings */}
                    <motion.div
                      animate={{ 
                        scale: [1, 1.4, 1.4],
                        opacity: [0.5, 0, 0]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeOut'
                      }}
                      className="absolute inset-0 rounded-full bg-primary/30"
                    />
                    <motion.div
                      animate={{ 
                        scale: [1, 1.3, 1.3],
                        opacity: [0.5, 0, 0]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeOut',
                        delay: 0.3
                      }}
                      className="absolute inset-0 rounded-full bg-primary/40"
                    />
                    
                    {/* Icon container */}
                    <div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/30">
                      <motion.div
                        animate={{ rotate: [0, -10, 10, -10, 0] }}
                        transition={{ 
                          duration: 0.5,
                          repeat: Infinity,
                          repeatDelay: 2
                        }}
                      >
                        <BellRing className="w-9 h-9 text-white" />
                      </motion.div>
                    </div>
                  </motion.div>

                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-2xl font-bold text-text-primary mb-2"
                  >
                    Stay in the Loop
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-text-secondary text-sm max-w-xs mx-auto"
                  >
                    Enable notifications to receive important updates about your loved ones
                  </motion.p>
                </div>

                {/* Features */}
                <div className="px-6 pb-6">
                  <div className="grid grid-cols-2 gap-3">
                    {FEATURES.map((feature, index) => (
                      <motion.div
                        key={feature.title}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ 
                          opacity: animationStep > index ? 1 : 0,
                          x: animationStep > index ? 0 : -20
                        }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className={cn(
                          'flex items-start gap-3 p-3 rounded-xl',
                          'bg-bg-muted/50 border border-border-subtle/50'
                        )}
                      >
                        <div className={cn(
                          'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center',
                          'bg-bg-surface shadow-sm'
                        )}>
                          <feature.icon className={cn('w-5 h-5', feature.color)} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {feature.title}
                          </p>
                          <p className="text-xs text-text-tertiary line-clamp-2">
                            {feature.description}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 space-y-3">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleEnable}
                    isLoading={isLoading}
                    className="w-full rounded-xl h-12 font-semibold shadow-lg shadow-primary/20"
                  >
                    <Bell className="w-5 h-5 mr-2" />
                    Enable Notifications
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={onClose}
                    disabled={isLoading}
                    className="w-full rounded-xl h-11 text-text-secondary hover:text-text-primary"
                  >
                    Maybe Later
                  </Button>
                </div>

                {/* Footer note */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="px-6 pb-5 text-center"
                >
                  <p className="text-xs text-text-tertiary">
                    You can change this anytime in Settings → Notifications
                  </p>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

