/**
 * Shift Reminder Worker
 * 
 * Features:
 * - Zod validation of job payload
 * - Uses DB as source of truth for shift times
 * - Proper timezone handling with date-fns-tz
 * - Idempotent notification creation
 * - Structured logging
 * - Error classification with DLQ support
 */

import { Worker, Job } from 'bullmq';
import { prisma } from '@carecircle/database';
import { 
  ShiftReminderJobSchema, 
  validateJobPayload,
  type ShiftReminderJob 
} from '@carecircle/config';
import { formatInTimeZone } from 'date-fns-tz';
import { 
  getRedisConnection, 
  QUEUE_NAMES, 
  getDefaultWorkerOptions,
  logger 
} from '../config';
import { notificationQueue, moveToDeadLetter } from '../queues';
import { createJobLogger } from '@carecircle/logger';

// ============================================================================
// ERROR CLASSIFICATION
// ============================================================================

type ErrorType = 'transient' | 'permanent' | 'validation';

function classifyError(error: unknown): ErrorType {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Validation errors are permanent (don't retry)
    if (message.includes('invalid') || message.includes('validation')) {
      return 'validation';
    }
    
    // Database connection errors are transient (retry)
    if (
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('too many connections')
    ) {
      return 'transient';
    }
    
    // Not found errors are permanent
    if (message.includes('not found')) {
      return 'permanent';
    }
  }
  
  return 'transient'; // Default to transient for unknown errors
}

// ============================================================================
// WORKER PROCESSOR
// ============================================================================

async function processShiftReminder(job: Job<ShiftReminderJob>) {
  const jobLogger = createJobLogger(logger, job.id || 'unknown', 'shift-reminder');
  
  // Step 1: Validate job payload
  const validatedData = validateJobPayload(
    ShiftReminderJobSchema,
    job.data,
    'ShiftReminderJob'
  );

  const { shiftId, caregiverId, minutesBefore } = validatedData;

  jobLogger.info({ shiftId, minutesBefore }, 'Processing shift reminder');

  // Step 2: Fetch shift from DB (source of truth)
  const shift = await prisma.caregiverShift.findUnique({
    where: { id: shiftId },
    include: {
      caregiver: true,
      careRecipient: true,
    },
  });

  if (!shift) {
    jobLogger.warn({ shiftId }, 'Shift not found, skipping');
    return { skipped: true, reason: 'shift_not_found' };
  }

  // Step 3: Check if shift is still scheduled (not cancelled/completed)
  if (shift.status !== 'SCHEDULED') {
    jobLogger.info({ shiftId, status: shift.status }, 'Shift no longer scheduled, skipping');
    return { skipped: true, reason: 'shift_not_scheduled' };
  }

  const caregiver = shift.caregiver;
  const careRecipient = shift.careRecipient;
  
  // Step 4: Format time with proper timezone
  // Use caregiver's timezone for the notification
  const timezone = caregiver.timezone || 'America/New_York';
  const formattedTime = formatInTimeZone(
    shift.startTime, // Use DB source of truth, not job data
    timezone,
    'h:mm a'
  );

  // Step 5: Build notification content
  let title: string;
  let body: string;

  if (minutesBefore === 60) {
    title = '⏰ Shift Starting in 1 Hour';
    body = `Your caregiving shift for ${careRecipient.preferredName || careRecipient.firstName} starts at ${formattedTime}.`;
  } else if (minutesBefore === 15) {
    title = '⏰ Shift Starting in 15 Minutes';
    body = `Your caregiving shift for ${careRecipient.preferredName || careRecipient.firstName} starts at ${formattedTime}. Please prepare.`;
  } else {
    title = '⏰ Shift Starting Soon';
    body = `Your caregiving shift for ${careRecipient.preferredName || careRecipient.firstName} starts in ${minutesBefore} minutes.`;
  }

  // Step 6: Create notification with idempotency
  // Use upsert to prevent duplicate notifications
  const idempotencyKey = `shift-${shiftId}-${minutesBefore}`;
  
  const notification = await prisma.notification.upsert({
    where: {
      // Unique constraint: one notification per shift per reminder window
      userId_type_data: {
        userId: caregiverId,
        type: 'SHIFT_REMINDER',
        // Store idempotency data in the data field
        data: { shiftId, minutesBefore },
      } as unknown as { id: string },
    },
    create: {
      userId: caregiverId,
      type: 'SHIFT_REMINDER',
      title,
      body,
      data: {
        shiftId,
        careRecipientId: careRecipient.id,
        startTime: shift.startTime.toISOString(),
        minutesBefore,
        idempotencyKey,
      },
    },
    update: {
      // If exists, just update timestamp
      updatedAt: new Date(),
    },
  }).catch(async (err) => {
    // If unique constraint doesn't exist, fallback to create with check
    if (err.code === 'P2002' || err.code === 'P2025') {
      // Already exists, skip
      jobLogger.info({ idempotencyKey }, 'Notification already sent (idempotent)');
      return null;
    }
    
    // Try regular create with manual idempotency check
    const existing = await prisma.notification.findFirst({
      where: {
        userId: caregiverId,
        type: 'SHIFT_REMINDER',
        data: {
          path: ['idempotencyKey'],
          equals: idempotencyKey,
        },
      },
    });

    if (existing) {
      jobLogger.info({ idempotencyKey }, 'Notification already sent (idempotent)');
      return null;
    }

    return prisma.notification.create({
      data: {
        userId: caregiverId,
        type: 'SHIFT_REMINDER',
        title,
        body,
        data: {
          shiftId,
          careRecipientId: careRecipient.id,
          startTime: shift.startTime.toISOString(),
          minutesBefore,
          idempotencyKey,
        },
      },
    });
  });

  if (!notification) {
    return { skipped: true, reason: 'duplicate_notification' };
  }

  // Step 7: Queue push notification (only if notification was created)
  await notificationQueue.add(
    'send-push',
    {
      type: 'PUSH',
      userId: caregiverId,
      title,
      body,
      data: {
        type: 'SHIFT_REMINDER',
        shiftId,
        careRecipientId: careRecipient.id,
        notificationId: notification.id,
      },
      priority: minutesBefore <= 15 ? 'high' : 'normal',
    },
    {
      // Use idempotency key as job ID to prevent duplicate push jobs
      jobId: `push-${idempotencyKey}`,
    }
  );

  jobLogger.info(
    { caregiverId, shiftId, minutesBefore },
    `Shift reminder sent to ${caregiver.fullName}`
  );

  return { 
    success: true, 
    caregiverId,
    shiftId,
    notificationId: notification.id,
  };
}

// ============================================================================
// WORKER INSTANCE
// ============================================================================

const workerOptions = getDefaultWorkerOptions();

export const shiftReminderWorker = new Worker<ShiftReminderJob>(
  QUEUE_NAMES.SHIFT_REMINDERS,
  async (job) => {
    try {
      return await processShiftReminder(job);
    } catch (error) {
      const errorType = classifyError(error);
      const jobLogger = createJobLogger(logger, job.id || 'unknown', 'shift-reminder');
      
      if (errorType === 'permanent' || errorType === 'validation') {
        // Move to DLQ and don't retry
        await moveToDeadLetter(
          QUEUE_NAMES.SHIFT_REMINDERS,
          job.id || 'unknown',
          'shift-reminder',
          job.data,
          error instanceof Error ? error.message : String(error),
          job.attemptsMade
        );
        
        jobLogger.error({ err: error, errorType }, 'Permanent failure, moved to DLQ');
        return { failed: true, movedToDLQ: true };
      }
      
      // Transient error - let BullMQ retry with backoff
      throw error;
    }
  },
  {
    connection: getRedisConnection(),
    ...workerOptions,
    concurrency: 10,
  }
);

// ============================================================================
// WORKER EVENTS
// ============================================================================

shiftReminderWorker.on('completed', (job, result) => {
  const jobLogger = createJobLogger(logger, job.id || 'unknown', 'shift-reminder');
  jobLogger.debug({ result }, 'Job completed');
});

shiftReminderWorker.on('failed', (job, err) => {
  const jobLogger = createJobLogger(logger, job?.id || 'unknown', 'shift-reminder');
  jobLogger.error({ err, attemptsMade: job?.attemptsMade }, 'Job failed');
});

shiftReminderWorker.on('error', (err) => {
  logger.error({ err }, 'Worker error');
});
