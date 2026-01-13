import { Worker, Job } from 'bullmq';
import { prisma } from '@carecircle/database';
import { redisConnection, QUEUE_NAMES } from '../config';
import { AppointmentReminderJob, notificationQueue } from '../queues';

async function processAppointmentReminder(job: Job<AppointmentReminderJob>) {
  const { appointmentId, careRecipientId, appointmentTime, title, location, minutesBefore } = job.data;

  console.log(`📅 Processing appointment reminder: ${title} (${minutesBefore} min before)`);

  try {
    // Get all family members who should receive the reminder
    const familyMembers = await prisma.familyMember.findMany({
      where: {
        family: {
          careRecipients: {
            some: { id: careRecipientId },
          },
        },
      },
      include: {
        user: {
          include: {
            pushTokens: true,
          },
        },
      },
    });

    // Get transport assignment if any
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        careRecipient: true,
        transportAssignment: true,
      },
    });

    const careRecipient = appointment?.careRecipient;

    // Fetch transport person separately if there's an assignment
    let transportPerson: { id: string; fullName: string } | null = null;
    if (appointment?.transportAssignment?.assignedToId) {
      const user = await prisma.user.findUnique({
        where: { id: appointment.transportAssignment.assignedToId },
        select: { id: true, fullName: true },
      });
      transportPerson = user;
    }

    // Create notification content
    let notifTitle: string;
    let body: string;

    if (minutesBefore >= 1440) {
      // 1 day before
      notifTitle = `📅 Appointment Tomorrow`;
      body = `${title} for ${careRecipient?.preferredName || careRecipient?.firstName} is tomorrow.`;
    } else if (minutesBefore >= 60) {
      // 1 hour before
      notifTitle = `📅 Appointment in 1 Hour`;
      body = `${title} for ${careRecipient?.preferredName || careRecipient?.firstName}`;
      if (location) body += ` at ${location}`;
    } else {
      // 30 min before
      notifTitle = `📅 Appointment Soon`;
      body = `${title} starts in ${minutesBefore} minutes`;
      if (location) body += ` at ${location}`;
    }

    if (transportPerson && minutesBefore <= 60) {
      body += `. Transport: ${transportPerson.fullName}`;
    }

    // Queue notifications for each family member
    for (const member of familyMembers) {
      // In-app notification
      await prisma.notification.create({
        data: {
          userId: member.userId,
          type: 'APPOINTMENT_REMINDER',
          title: notifTitle,
          body,
          data: {
            appointmentId,
            careRecipientId,
            appointmentTime,
          },
        },
      });

      // Push notifications
      for (const token of member.user.pushTokens) {
        await notificationQueue.add('send-push', {
          type: 'PUSH',
          userId: member.userId,
          title: notifTitle,
          body,
          data: {
            type: 'APPOINTMENT_REMINDER',
            appointmentId,
            careRecipientId,
          },
          priority: minutesBefore <= 60 ? 'high' : 'normal',
        });
      }
    }

    // Special notification for transport person
    if (transportPerson && minutesBefore === 60) {
      await prisma.notification.create({
        data: {
          userId: transportPerson.id,
          type: 'APPOINTMENT_REMINDER',
          title: `🚗 Transport Reminder`,
          body: `You're providing transport for ${careRecipient?.preferredName || careRecipient?.firstName}'s appointment in 1 hour.`,
          data: {
            appointmentId,
            careRecipientId,
            appointmentTime,
            location: location || '',
            isTransportReminder: true,
          },
        },
      });
    }

    console.log(`✅ Appointment reminder sent to ${familyMembers.length} family members`);
  } catch (error) {
    console.error('Error processing appointment reminder:', error);
    throw error;
  }
}

export const appointmentReminderWorker = new Worker<AppointmentReminderJob>(
  QUEUE_NAMES.APPOINTMENT_REMINDERS,
  processAppointmentReminder,
  {
    connection: redisConnection,
    concurrency: 10,
  }
);

appointmentReminderWorker.on('completed', (job) => {
  console.log(`📅 Appointment reminder job ${job.id} completed`);
});

appointmentReminderWorker.on('failed', (job, err) => {
  console.error(`📅 Appointment reminder job ${job?.id} failed:`, err);
});

