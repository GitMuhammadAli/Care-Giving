/**
 * Refill Alert Worker
 * 
 * Notifies family members when medication supply is running low.
 * 
 * Features:
 * - Validates job payload
 * - Idempotent notifications (one per day per medication)
 * - Notifies all family members
 * - Structured logging
 */

import { Worker, Job } from 'bullmq';
import { prisma } from '@carecircle/database';
import { 
  RefillAlertJobSchema, 
  validateJobPayload,
  type RefillAlertJob 
} from '@carecircle/config';
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

async function processRefillAlert(job: Job<RefillAlertJob>) {
  const jobLogger = createJobLogger(logger, job.id || 'unknown', 'refill-alert');
  
  // Step 1: Validate job payload
  const validatedData = validateJobPayload(
    RefillAlertJobSchema,
    job.data,
    'RefillAlertJob'
  );

  const { 
    medicationId, 
    medicationName, 
    currentSupply, 
    refillAt,
    careRecipientId,
    careRecipientName,
    familyMemberUserIds 
  } = validatedData;

  jobLogger.info({ medicationId, currentSupply, refillAt }, 'Processing refill alert');

  // Step 2: Verify medication still needs refill (double-check)
  const medication = await prisma.medication.findUnique({
    where: { id: medicationId },
  });

  if (!medication || !medication.isActive) {
    jobLogger.info({ medicationId }, 'Medication not found or inactive, skipping');
    return { skipped: true, reason: 'medication_not_active' };
  }

  // Re-check supply level from DB
  if (medication.currentSupply === null || medication.refillAt === null) {
    jobLogger.info({ medicationId }, 'Medication supply tracking not configured');
    return { skipped: true, reason: 'no_supply_tracking' };
  }

  if (medication.currentSupply > medication.refillAt) {
    jobLogger.info(
      { medicationId, currentSupply: medication.currentSupply, refillAt: medication.refillAt },
      'Supply level adequate now, skipping'
    );
    return { skipped: true, reason: 'supply_adequate' };
  }

  // Step 3: Build notification content
  const urgencyLevel = medication.currentSupply <= 5 ? 'urgent' : 'low';
  
  let title: string;
  let body: string;

  if (urgencyLevel === 'urgent') {
    title = `🚨 Urgent: ${medicationName} Running Out`;
    body = `${careRecipientName}'s ${medicationName} supply is critically low (${medication.currentSupply} remaining). Please refill immediately.`;
  } else {
    title = `💊 Refill Needed: ${medicationName}`;
    body = `${careRecipientName}'s ${medicationName} supply is low (${medication.currentSupply} remaining, refill threshold: ${medication.refillAt}). Time to order a refill.`;
  }

  // Step 4: Idempotency key (one alert per day per medication)
  const today = new Date().toISOString().split('T')[0];
  const idempotencyKey = `refill-${medicationId}-${today}`;

  // Step 5: Notify all family members
  const notifications = [];
  
  for (const userId of familyMemberUserIds) {
    // Check for existing notification (idempotency)
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        type: 'REFILL_ALERT',
        data: {
          path: ['idempotencyKey'],
          equals: idempotencyKey,
        },
      },
    });

    if (existing) {
      jobLogger.debug({ userId, idempotencyKey }, 'Refill alert already sent today');
      continue;
    }

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: 'REFILL_ALERT',
        title,
        body,
        data: {
          medicationId,
          careRecipientId,
          currentSupply: medication.currentSupply,
          refillAt: medication.refillAt,
          urgencyLevel,
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
        userId,
        title,
        body,
        data: {
          type: 'REFILL_ALERT',
          medicationId,
          careRecipientId,
          notificationId: notification.id,
        },
        priority: urgencyLevel === 'urgent' ? 'high' : 'normal',
      },
      {
        jobId: `push-${idempotencyKey}-${userId}`,
      }
    );

    // For urgent refills, also send email
    if (urgencyLevel === 'urgent') {
      await notificationQueue.add(
        'send-email',
        {
          type: 'EMAIL',
          userId,
          title,
          body,
          data: {
            type: 'REFILL_ALERT',
            medicationId,
            careRecipientId,
          },
          priority: 'high',
        },
        {
          jobId: `email-${idempotencyKey}-${userId}`,
        }
      );
    }
  }

  jobLogger.info(
    { medicationId, notificationCount: notifications.length, urgencyLevel },
    `Refill alert sent to ${notifications.length} family members`
  );

  return { 
    success: true, 
    medicationId,
    notificationCount: notifications.length,
    urgencyLevel,
  };
}

// ============================================================================
// WORKER INSTANCE
// ============================================================================

const workerOptions = getDefaultWorkerOptions();

export const refillAlertWorker = new Worker<RefillAlertJob>(
  QUEUE_NAMES.REFILL_ALERTS,
  async (job) => {
    try {
      return await processRefillAlert(job);
    } catch (error) {
      const errorType = classifyError(error);
      const jobLogger = createJobLogger(logger, job.id || 'unknown', 'refill-alert');
      
      if (errorType === 'permanent' || errorType === 'validation') {
        await moveToDeadLetter(
          QUEUE_NAMES.REFILL_ALERTS,
          job.id || 'unknown',
          'refill-alert',
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
    concurrency: 5,
  }
);

// ============================================================================
// WORKER EVENTS
// ============================================================================

refillAlertWorker.on('completed', (job, result) => {
  const jobLogger = createJobLogger(logger, job.id || 'unknown', 'refill-alert');
  jobLogger.debug({ result }, 'Job completed');
});

refillAlertWorker.on('failed', (job, err) => {
  const jobLogger = createJobLogger(logger, job?.id || 'unknown', 'refill-alert');
  jobLogger.error({ err, attemptsMade: job?.attemptsMade }, 'Job failed');
});

refillAlertWorker.on('error', (err) => {
  logger.error({ err }, 'Worker error');
});

