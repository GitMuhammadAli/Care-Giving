import { Worker, Job } from 'bullmq';
import { prisma } from '@carecircle/database';
import { redisConnection, QUEUE_NAMES } from '../config';
import { MedicationReminderJob, notificationQueue } from '../queues';

async function processMedicationReminder(job: Job<MedicationReminderJob>) {
  const { medicationId, careRecipientId, scheduledTime, medicationName, dosage, minutesBefore } = job.data;

  console.log(`💊 Processing medication reminder: ${medicationName} ${dosage} (${minutesBefore} min before)`);

  try {
    // Get all family members who should receive the reminder
    const familyMembers = await prisma.familyMember.findMany({
      where: {
        family: {
          careRecipients: {
            some: { id: careRecipientId },
          },
        },
        role: { in: ['ADMIN', 'CAREGIVER'] },
      },
      include: {
        user: {
          include: {
            pushTokens: true,
          },
        },
      },
    });

    const careRecipient = await prisma.careRecipient.findUnique({
      where: { id: careRecipientId },
    });

    // Create notification content
    let title: string;
    let body: string;

    if (minutesBefore === 0) {
      title = `⏰ Medication Due Now`;
      body = `${medicationName} ${dosage} for ${careRecipient?.preferredName || careRecipient?.firstName} is due now.`;
    } else {
      title = `💊 Medication Reminder`;
      body = `${medicationName} ${dosage} for ${careRecipient?.preferredName || careRecipient?.firstName} is due in ${minutesBefore} minutes.`;
    }

    // Queue notifications for each family member
    for (const member of familyMembers) {
      // In-app notification
      await prisma.notification.create({
        data: {
          userId: member.userId,
          type: 'MEDICATION_REMINDER',
          title,
          body,
          data: {
            medicationId,
            careRecipientId,
            scheduledTime,
          },
        },
      });

      // Push notifications
      for (const token of member.user.pushTokens) {
        await notificationQueue.add('send-push', {
          type: 'PUSH',
          userId: member.userId,
          title,
          body,
          data: {
            type: 'MEDICATION_REMINDER',
            medicationId,
            careRecipientId,
            scheduledTime,
          },
          priority: minutesBefore === 0 ? 'high' : 'normal',
        });
      }
    }

    console.log(`✅ Medication reminder sent to ${familyMembers.length} family members`);
  } catch (error) {
    console.error('Error processing medication reminder:', error);
    throw error;
  }
}

export const medicationReminderWorker = new Worker<MedicationReminderJob>(
  QUEUE_NAMES.MEDICATION_REMINDERS,
  processMedicationReminder,
  {
    connection: redisConnection,
    concurrency: 10,
  }
);

medicationReminderWorker.on('completed', (job) => {
  console.log(`💊 Medication reminder job ${job.id} completed`);
});

medicationReminderWorker.on('failed', (job, err) => {
  console.error(`💊 Medication reminder job ${job?.id} failed:`, err);
});

