/**
 * Queue Definitions
 * All queues with proper default options and DLQ support
 */

import { Queue, QueueEvents } from 'bullmq';
import { getRedisConnection, QUEUE_NAMES, getDefaultJobOptions, logger } from './config';
import type {
  MedicationReminderJob,
  AppointmentReminderJob,
  ShiftReminderJob,
  NotificationJob,
  RefillAlertJob,
} from '@carecircle/config';

// Re-export types for consumers
export type {
  MedicationReminderJob,
  AppointmentReminderJob,
  ShiftReminderJob,
  NotificationJob,
  RefillAlertJob,
} from '@carecircle/config';

// ============================================================================
// DEAD LETTER JOB TYPE
// ============================================================================

export interface DeadLetterJob {
  originalQueue: string;
  originalJobId: string;
  originalJobName: string;
  payload: unknown;
  error: string;
  failedAt: string;
  attemptsMade: number;
}

// ============================================================================
// QUEUE FACTORY
// ============================================================================

const defaultJobOptions = getDefaultJobOptions();

function createQueue<T>(name: string): Queue<T> {
  const queue = new Queue<T>(name, {
    connection: getRedisConnection(),
    defaultJobOptions,
  });

  // Log queue events
  const events = new QueueEvents(name, { connection: getRedisConnection() });
  
  events.on('failed', ({ jobId, failedReason }) => {
    logger.warn({ queue: name, jobId, failedReason }, 'Job failed');
  });

  events.on('stalled', ({ jobId }) => {
    logger.warn({ queue: name, jobId }, 'Job stalled');
  });

  return queue;
}

// ============================================================================
// QUEUE INSTANCES
// ============================================================================

export const medicationQueue = createQueue<MedicationReminderJob>(
  QUEUE_NAMES.MEDICATION_REMINDERS
);

export const appointmentQueue = createQueue<AppointmentReminderJob>(
  QUEUE_NAMES.APPOINTMENT_REMINDERS
);

export const shiftQueue = createQueue<ShiftReminderJob>(
  QUEUE_NAMES.SHIFT_REMINDERS
);

export const notificationQueue = createQueue<NotificationJob>(
  QUEUE_NAMES.NOTIFICATIONS
);

export const refillAlertQueue = createQueue<RefillAlertJob>(
  QUEUE_NAMES.REFILL_ALERTS
);

// Dead Letter Queue
export const deadLetterQueue = createQueue<DeadLetterJob>(
  QUEUE_NAMES.DEAD_LETTER
);

// ============================================================================
// HELPER: MOVE TO DLQ
// ============================================================================

/**
 * Move a permanently failed job to the dead letter queue
 */
export async function moveToDeadLetter(
  originalQueue: string,
  jobId: string,
  jobName: string,
  payload: unknown,
  error: string,
  attemptsMade: number
): Promise<void> {
  await deadLetterQueue.add(
    'dead-letter',
    {
      originalQueue,
      originalJobId: jobId,
      originalJobName: jobName,
      payload,
      error,
      failedAt: new Date().toISOString(),
      attemptsMade,
    },
    {
      // DLQ jobs should be kept longer
      removeOnComplete: { age: 604800, count: 10000 }, // 7 days
      removeOnFail: false, // Never remove failed DLQ items
    }
  );

  logger.error({
    originalQueue,
    jobId,
    jobName,
    error,
  }, 'Job moved to dead letter queue');
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

const queues = [
  medicationQueue,
  appointmentQueue,
  shiftQueue,
  notificationQueue,
  refillAlertQueue,
  deadLetterQueue,
];

export async function closeAllQueues(): Promise<void> {
  logger.info('Closing all queues...');
  await Promise.all(queues.map((q) => q.close()));
  logger.info('All queues closed');
}
