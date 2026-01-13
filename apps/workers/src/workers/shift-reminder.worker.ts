import { Worker, Job } from 'bullmq';
import { prisma } from '@carecircle/database';
import { redisConnection, QUEUE_NAMES } from '../config';
import { ShiftReminderJob, notificationQueue } from '../queues';
import { format } from 'date-fns';

async function processShiftReminder(job: Job<ShiftReminderJob>) {
  const { shiftId, careRecipientId, caregiverId, startTime, minutesBefore } = job.data;

  console.log(`👥 Processing shift reminder: ${shiftId} (${minutesBefore} min before)`);

  try {
    const shift = await prisma.caregiverShift.findUnique({
      where: { id: shiftId },
      include: {
        caregiver: true,
        careRecipient: true,
      },
    });

    if (!shift) {
      console.log(`Shift ${shiftId} not found, skipping`);
      return;
    }

    const caregiver = shift.caregiver;
    const careRecipient = shift.careRecipient;
    const formattedTime = format(new Date(startTime), 'h:mm a');

    // Notification content
    let title: string;
    let body: string;

    if (minutesBefore === 60) {
      title = `⏰ Shift Starting in 1 Hour`;
      body = `Your caregiving shift for ${careRecipient.preferredName || careRecipient.firstName} starts at ${formattedTime}.`;
    } else {
      title = `⏰ Shift Starting Soon`;
      body = `Your caregiving shift for ${careRecipient.preferredName || careRecipient.firstName} starts in ${minutesBefore} minutes.`;
    }

    // Notify the caregiver
    await prisma.notification.create({
      data: {
        userId: caregiverId,
        type: 'SHIFT_REMINDER',
        title,
        body,
        data: {
          shiftId,
          careRecipientId,
          startTime,
        },
      },
    });

    // Get caregiver's push tokens
    const pushTokens = await prisma.pushToken.findMany({
      where: { userId: caregiverId },
    });

    for (const token of pushTokens) {
      await notificationQueue.add('send-push', {
        type: 'PUSH',
        userId: caregiverId,
        title,
        body,
        data: {
          type: 'SHIFT_REMINDER',
          shiftId,
          careRecipientId,
        },
        priority: 'high',
      });
    }

    console.log(`✅ Shift reminder sent to ${caregiver.fullName}`);
  } catch (error) {
    console.error('Error processing shift reminder:', error);
    throw error;
  }
}

export const shiftReminderWorker = new Worker<ShiftReminderJob>(
  QUEUE_NAMES.SHIFT_REMINDERS,
  processShiftReminder,
  {
    connection: redisConnection,
    concurrency: 10,
  }
);

shiftReminderWorker.on('completed', (job) => {
  console.log(`👥 Shift reminder job ${job.id} completed`);
});

shiftReminderWorker.on('failed', (job, err) => {
  console.error(`👥 Shift reminder job ${job?.id} failed:`, err);
});

