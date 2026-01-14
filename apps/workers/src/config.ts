import Redis from 'ioredis';

export const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const QUEUE_NAMES = {
  MEDICATION_REMINDERS: 'medication-reminders',
  APPOINTMENT_REMINDERS: 'appointment-reminders',
  SHIFT_REMINDERS: 'shift-reminders',
  NOTIFICATIONS: 'notifications',
  REFILL_ALERTS: 'refill-alerts',
} as const;

export const config = {
  // Reminder windows
  medicationReminderMinutes: [30, 15, 5, 0], // Minutes before dose
  appointmentReminderMinutes: [1440, 60, 30], // 1 day, 1 hour, 30 min
  shiftReminderMinutes: [60, 15], // 1 hour, 15 min before shift
  
  // Check intervals
  schedulerIntervalMs: 60 * 1000, // Check every minute
  
  // Firebase (for push notifications)
  firebaseEnabled: !!process.env.FIREBASE_SERVICE_ACCOUNT,
};

