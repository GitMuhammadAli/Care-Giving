import { Queue } from 'bullmq';
import { redisConnection, QUEUE_NAMES } from './config';

export interface MedicationReminderJob {
  medicationId: string;
  careRecipientId: string;
  scheduledTime: string;
  medicationName: string;
  dosage: string;
  minutesBefore: number;
}

export interface AppointmentReminderJob {
  appointmentId: string;
  careRecipientId: string;
  appointmentTime: string;
  title: string;
  location?: string;
  minutesBefore: number;
}

export interface ShiftReminderJob {
  shiftId: string;
  careRecipientId: string;
  caregiverId: string;
  startTime: string;
  minutesBefore: number;
}

export interface NotificationJob {
  type: 'PUSH' | 'IN_APP' | 'SMS' | 'EMAIL';
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  priority?: 'normal' | 'high';
}

export const medicationQueue = new Queue<MedicationReminderJob>(
  QUEUE_NAMES.MEDICATION_REMINDERS,
  { connection: redisConnection }
);

export const appointmentQueue = new Queue<AppointmentReminderJob>(
  QUEUE_NAMES.APPOINTMENT_REMINDERS,
  { connection: redisConnection }
);

export const shiftQueue = new Queue<ShiftReminderJob>(
  QUEUE_NAMES.SHIFT_REMINDERS,
  { connection: redisConnection }
);

export const notificationQueue = new Queue<NotificationJob>(
  QUEUE_NAMES.NOTIFICATIONS,
  { connection: redisConnection }
);

