/**
 * Medication Reminder Worker
 * 
 * Features:
 * - Zod validation of job payload
 * - Proper timezone handling
 * - Idempotent notification creation
 * - Structured logging
 * - DLQ support for permanent failures
 */

import { Worker, Job } from 'bullmq';
import { prisma } from '@carecircle/database';
import { 
  MedicationReminderJobSchema, 
  validateJobPayload,
  type MedicationReminderJob 
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
    
    if (message.includes('invalid') || message.includes('validation')) {
      return 'validation';
    }
    
    if (
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('econnrefused')
    ) {
      return 'transient';
    }
    
    if (message.includes('not found')) {
      return 'permanent';
    }
  }
  
  return 'transient';
}

// ============================================================================
// WORKER PROCESSOR
// ============================================================================

async function processMedicationReminder(job: Job<MedicationReminderJob>) {
  const jobLogger = createJobLogger(logger, job.id || 'unknown', 'medication-reminder');
  
  // Step 1: Validate job payload
  const validatedData = validateJobPayload(
    MedicationReminderJobSchema,
    job.data,
    'MedicationReminderJob'
  );

  const { medicationId, careRecipientId, scheduledTime, medicationName, dosage, minutesBefore } = validatedData;

  jobLogger.info({ medicationId, minutesBefore }, 'Processing medication reminder');

  // Step 2: Fetch medication from DB (verify it's still active)
  const medication = await prisma.medication.findUnique({
    where: { id: medicationId },
    include: {
      careRecipient: {
        include: {
          family: {
            include: {
              members: {
                where: { isActive: true },
                select: { userId: true, role: true },
              },
            },
          },
        },
      },
    },
  });

  if (!medication) {
    jobLogger.warn({ medicationId }, 'Medication not found, skipping');
    return { skipped: true, reason: 'medication_not_found' };
  }

  if (!medication.isActive) {
    jobLogger.info({ medicationId }, 'Medication inactive, skipping');
    return { skipped: true, reason: 'medication_inactive' };
  }

  const careRecipient = medication.careRecipient;
  const familyMembers = careRecipient.family.members;

  // Step 3: Format time with timezone
  const timezone = 'America/New_York'; // TODO: Get from family settings or user preferences
  const formattedTime = formatInTimeZone(
    new Date(scheduledTime),
    timezone,
    'h:mm a'
  );

  // Step 4: Build notification content
  let title: string;
  let body: string;
  const careRecipientName = careRecipient.preferredName || careRecipient.fullName;

  if (minutesBefore === 0) {
    title = `💊 Time for ${careRecipientName}'s Medication`;
    body = `${medicationName} (${dosage}) is due now.`;
  } else if (minutesBefore === 5) {
    title = `💊 Medication in 5 Minutes`;
    body = `${careRecipientName} needs ${medicationName} (${dosage}) at ${formattedTime}.`;
  } else {
    title = `💊 Medication Reminder`;
    body = `${careRecipientName} needs ${medicationName} (${dosage}) in ${minutesBefore} minutes.`;
  }

  // Step 5: Idempotency key
  const scheduledDate = new Date(scheduledTime).toISOString().split('T')[0];
  const idempotencyKey = `med-${medicationId}-${scheduledDate}-${minutesBefore}`;

  // Step 6: Notify all family members with notifications enabled
  const notifications = [];
  
  for (const member of familyMembers) {
    // Check for existing notification (idempotency)
    const existing = await prisma.notification.findFirst({
      where: {
        userId: member.userId,
        type: 'MEDICATION_REMINDER',
        data: {
          path: ['idempotencyKey'],
          equals: idempotencyKey,
        },
      },
    });

    if (existing) {
      jobLogger.debug({ userId: member.userId, idempotencyKey }, 'Notification already sent');
      continue;
    }

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        userId: member.userId,
        type: 'MEDICATION_REMINDER',
        title,
        body,
        data: {
          medicationId,
          careRecipientId,
          scheduledTime,
          minutesBefore,
          idempotencyKey,
        },
      },
    });

    notifications.push(notification);

    // Queue push notification
    await notificationQueue.add(
      'send-push',
      {
        type: 'PUSH',
        userId: member.userId,
        title,
        body,
        data: {
          type: 'MEDICATION_REMINDER',
          medicationId,
          careRecipientId,
          notificationId: notification.id,
        },
        priority: minutesBefore <= 5 ? 'high' : 'normal',
      },
      {
        jobId: `push-${idempotencyKey}-${member.userId}`,
      }
    );
  }

  jobLogger.info(
    { medicationId, notificationCount: notifications.length },
    `Medication reminder sent to ${notifications.length} family members`
  );

  return { 
    success: true, 
    medicationId,
    notificationCount: notifications.length,
  };
}

// ============================================================================
// WORKER INSTANCE
// ============================================================================

const workerOptions = getDefaultWorkerOptions();

export const medicationReminderWorker = new Worker<MedicationReminderJob>(
  QUEUE_NAMES.MEDICATION_REMINDERS,
  async (job) => {
    try {
      return await processMedicationReminder(job);
    } catch (error) {
      const errorType = classifyError(error);
      const jobLogger = createJobLogger(logger, job.id || 'unknown', 'medication-reminder');
      
      if (errorType === 'permanent' || errorType === 'validation') {
        await moveToDeadLetter(
          QUEUE_NAMES.MEDICATION_REMINDERS,
          job.id || 'unknown',
          'medication-reminder',
          job.data,
          error instanceof Error ? error.message : String(error),
          job.attemptsMade
        );
        
        jobLogger.error({ err: error, errorType }, 'Permanent failure, moved to DLQ');
        return { failed: true, movedToDLQ: true };
      }
      
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

medicationReminderWorker.on('completed', (job, result) => {
  const jobLogger = createJobLogger(logger, job.id || 'unknown', 'medication-reminder');
  jobLogger.debug({ result }, 'Job completed');
});

medicationReminderWorker.on('failed', (job, err) => {
  const jobLogger = createJobLogger(logger, job?.id || 'unknown', 'medication-reminder');
  jobLogger.error({ err, attemptsMade: job?.attemptsMade }, 'Job failed');
});

medicationReminderWorker.on('error', (err) => {
  logger.error({ err }, 'Worker error');
});
