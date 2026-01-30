/**
 * Appointment Reminder Worker
 * 
 * Features:
 * - Zod validation of job payload
 * - Timezone-aware time formatting
 * - Idempotent notifications
 * - Structured logging
 * - DLQ support
 */

import { Worker, Job } from 'bullmq';
import { prisma } from '@carecircle/database';
import { 
  AppointmentReminderJobSchema, 
  validateJobPayload,
  type AppointmentReminderJob 
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

async function processAppointmentReminder(job: Job<AppointmentReminderJob>) {
  const jobLogger = createJobLogger(logger, job.id || 'unknown', 'appointment-reminder');
  
  // Step 1: Validate job payload
  const validatedData = validateJobPayload(
    AppointmentReminderJobSchema,
    job.data,
    'AppointmentReminderJob'
  );

  const { appointmentId, minutesBefore } = validatedData;

  jobLogger.info({ appointmentId, minutesBefore }, 'Processing appointment reminder');

  // Step 2: Fetch appointment from DB (source of truth)
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      careRecipient: {
        include: {
          family: {
            include: {
              members: {
                where: { isActive: true },
                include: {
                  user: {
                    select: { id: true, timezone: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!appointment) {
    jobLogger.warn({ appointmentId }, 'Appointment not found, skipping');
    return { skipped: true, reason: 'appointment_not_found' };
  }

  // Check if appointment is still scheduled
  if (!['SCHEDULED', 'CONFIRMED'].includes(appointment.status)) {
    jobLogger.info({ appointmentId, status: appointment.status }, 'Appointment no longer active, skipping');
    return { skipped: true, reason: 'appointment_not_active' };
  }

  const careRecipient = appointment.careRecipient;
  const familyMembers = careRecipient.family.members;

  // Step 3: Get timezone from first admin member, or fallback to first member, or default
  const adminMember = familyMembers.find(m => m.role === 'ADMIN');
  const primaryMember = adminMember || familyMembers[0];
  const timezone = primaryMember?.user?.timezone || 'America/New_York';
  const formattedTime = formatInTimeZone(
    appointment.startTime, // Use DB source of truth
    timezone,
    'EEEE, MMM d \'at\' h:mm a'
  );

  // Step 4: Build notification content
  let title: string;
  let body: string;
  const careRecipientName = careRecipient.preferredName || careRecipient.fullName;

  if (minutesBefore === 1440) {
    // 24 hour reminder
    title = `📅 Appointment Tomorrow`;
    body = `${careRecipientName} has "${appointment.title}" ${formattedTime}${appointment.location ? ` at ${appointment.location}` : ''}.`;
  } else if (minutesBefore === 60) {
    title = `📅 Appointment in 1 Hour`;
    body = `${careRecipientName}'s "${appointment.title}" starts at ${formatInTimeZone(appointment.startTime, timezone, 'h:mm a')}${appointment.location ? ` at ${appointment.location}` : ''}.`;
  } else if (minutesBefore === 30) {
    title = `📅 Appointment in 30 Minutes`;
    body = `${careRecipientName}'s "${appointment.title}" is coming up soon${appointment.location ? ` at ${appointment.location}` : ''}. Time to prepare!`;
  } else {
    title = `📅 Appointment Reminder`;
    body = `${careRecipientName}'s "${appointment.title}" is in ${minutesBefore} minutes.`;
  }

  // Step 5: Idempotency key
  const idempotencyKey = `apt-${appointmentId}-${minutesBefore}`;

  // Step 6: Notify all family members
  const notifications = [];
  
  for (const member of familyMembers) {
    const userId = member.user.id;
    
    // Check for existing notification (idempotency)
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        type: 'APPOINTMENT_REMINDER',
        data: {
          path: ['idempotencyKey'],
          equals: idempotencyKey,
        },
      },
    });

    if (existing) {
      jobLogger.debug({ userId, idempotencyKey }, 'Notification already sent');
      continue;
    }

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: 'APPOINTMENT_REMINDER',
        title,
        body,
        data: {
          appointmentId,
          careRecipientId: careRecipient.id,
          appointmentTime: appointment.startTime.toISOString(),
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
        userId,
        title,
        body,
        data: {
          type: 'APPOINTMENT_REMINDER',
          appointmentId,
          careRecipientId: careRecipient.id,
          notificationId: notification.id,
        },
        priority: minutesBefore <= 60 ? 'high' : 'normal',
      },
      {
        jobId: `push-${idempotencyKey}-${userId}`,
      }
    );
  }

  jobLogger.info(
    { appointmentId, notificationCount: notifications.length },
    `Appointment reminder sent to ${notifications.length} family members`
  );

  return { 
    success: true, 
    appointmentId,
    notificationCount: notifications.length,
  };
}

// ============================================================================
// WORKER INSTANCE
// ============================================================================

const workerOptions = getDefaultWorkerOptions();

export const appointmentReminderWorker = new Worker<AppointmentReminderJob>(
  QUEUE_NAMES.APPOINTMENT_REMINDERS,
  async (job) => {
    try {
      return await processAppointmentReminder(job);
    } catch (error) {
      const errorType = classifyError(error);
      const jobLogger = createJobLogger(logger, job.id || 'unknown', 'appointment-reminder');
      
      if (errorType === 'permanent' || errorType === 'validation') {
        await moveToDeadLetter(
          QUEUE_NAMES.APPOINTMENT_REMINDERS,
          job.id || 'unknown',
          'appointment-reminder',
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

appointmentReminderWorker.on('completed', (job, result) => {
  const jobLogger = createJobLogger(logger, job.id || 'unknown', 'appointment-reminder');
  jobLogger.debug({ result }, 'Job completed');
});

appointmentReminderWorker.on('failed', (job, err) => {
  const jobLogger = createJobLogger(logger, job?.id || 'unknown', 'appointment-reminder');
  jobLogger.error({ err, attemptsMade: job?.attemptsMade }, 'Job failed');
});

appointmentReminderWorker.on('error', (err) => {
  logger.error({ err }, 'Worker error');
});
