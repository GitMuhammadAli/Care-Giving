/**
 * Reminder Scheduler
 * 
 * Periodically checks for upcoming events and queues reminder jobs.
 * Uses database as source of truth for all times.
 * 
 * Features:
 * - Timezone-aware scheduling
 * - Idempotent job creation (uses meaningful job IDs)
 * - Structured logging
 * - Efficient batch queries
 */

import { prisma } from '@carecircle/database';
import { addMinutes, startOfMinute, endOfMinute, isWithinInterval, startOfDay } from 'date-fns';
import { medicationQueue, appointmentQueue, shiftQueue, refillAlertQueue } from './queues';
import { REMINDER_CONFIG, getDefaultJobOptions, logger } from './config';

class ReminderScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  start(): void {
    if (this.isRunning) {
      logger.warn('Scheduler already running');
      return;
    }

    logger.info('Reminder scheduler starting');
    this.isRunning = true;
    
    // Run immediately, then on interval
    this.checkAndQueueReminders().catch((err) => {
      logger.error({ err }, 'Initial scheduler run failed');
    });
    
    this.intervalId = setInterval(
      () => {
        this.checkAndQueueReminders().catch((err) => {
          logger.error({ err }, 'Scheduler run failed');
        });
      },
      REMINDER_CONFIG.schedulerIntervalMs
    );

    logger.info({ intervalMs: REMINDER_CONFIG.schedulerIntervalMs }, 'Reminder scheduler started');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('Reminder scheduler stopped');
  }

  private async checkAndQueueReminders(): Promise<void> {
    const now = new Date();
    
    // Run all checks in parallel
    const results = await Promise.allSettled([
      this.queueMedicationReminders(now),
      this.queueAppointmentReminders(now),
      this.queueShiftReminders(now),
      this.checkRefillAlerts(now),
    ]);

    // Log any failures
    results.forEach((result, idx) => {
      if (result.status === 'rejected') {
        const names = ['medication', 'appointment', 'shift', 'refill'];
        logger.error({ err: result.reason, type: names[idx] }, 'Scheduler check failed');
      }
    });
  }

  private async queueMedicationReminders(now: Date): Promise<void> {
    // Get all active medications with their schedules
    const medications = await prisma.medication.findMany({
      where: { isActive: true },
      include: {
        careRecipient: {
          select: { id: true }
        }
      },
    });

    let queued = 0;

    for (const med of medications) {
      for (const time of med.scheduledTimes) {
        const [hours, minutes] = time.split(':').map(Number);
        const scheduledTime = new Date(now);
        scheduledTime.setHours(hours, minutes, 0, 0);

        for (const minutesBefore of REMINDER_CONFIG.medicationReminderMinutes) {
          const reminderTime = addMinutes(scheduledTime, -minutesBefore);
          
          // Check if this reminder should be sent now (within this minute)
          if (isWithinInterval(now, {
            start: startOfMinute(reminderTime),
            end: endOfMinute(reminderTime),
          })) {
            // Use date + time for idempotency (one reminder per scheduled dose per day)
            const dateStr = now.toISOString().split('T')[0];
            const jobId = `med-${med.id}-${dateStr}-${time}-${minutesBefore}`;
            
            // Check if already logged for today (prevent double reminders)
            const existingLog = await prisma.medicationLog.findFirst({
              where: {
                medicationId: med.id,
                scheduledTime: {
                  gte: startOfMinute(scheduledTime),
                  lte: endOfMinute(scheduledTime),
                },
              },
            });

            if (!existingLog) {
              await medicationQueue.add(
                'medication-reminder',
                {
                  medicationId: med.id,
                  careRecipientId: med.careRecipientId,
                  scheduledTime: scheduledTime.toISOString(),
                  medicationName: med.name,
                  dosage: med.dosage,
                  minutesBefore,
                },
                { 
                  jobId,
                  ...getDefaultJobOptions(),
                }
              );
              queued++;
            }
          }
        }
      }
    }

    if (queued > 0) {
      logger.debug({ count: queued }, 'Medication reminders queued');
    }
  }

  private async queueAppointmentReminders(now: Date): Promise<void> {
    // Get upcoming appointments within the reminder window
    const maxMinutes = Math.max(...REMINDER_CONFIG.appointmentReminderMinutes);
    
    const appointments = await prisma.appointment.findMany({
      where: {
        startTime: {
          gte: now,
          lte: addMinutes(now, maxMinutes + 60),
        },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
      include: {
        careRecipient: {
          select: { id: true }
        }
      },
    });

    let queued = 0;

    for (const apt of appointments) {
      for (const minutesBefore of REMINDER_CONFIG.appointmentReminderMinutes) {
        const reminderTime = addMinutes(apt.startTime, -minutesBefore);
        
        if (isWithinInterval(now, {
          start: startOfMinute(reminderTime),
          end: endOfMinute(reminderTime),
        })) {
          const jobId = `apt-${apt.id}-${minutesBefore}`;
          
          await appointmentQueue.add(
            'appointment-reminder',
            {
              appointmentId: apt.id,
              careRecipientId: apt.careRecipientId,
              appointmentTime: apt.startTime.toISOString(),
              title: apt.title,
              location: apt.location || undefined,
              minutesBefore,
            },
            { 
              jobId,
              ...getDefaultJobOptions(),
            }
          );
          queued++;
        }
      }
    }

    if (queued > 0) {
      logger.debug({ count: queued }, 'Appointment reminders queued');
    }
  }

  private async queueShiftReminders(now: Date): Promise<void> {
    // Get upcoming shifts within the reminder window
    const maxMinutes = Math.max(...REMINDER_CONFIG.shiftReminderMinutes);
    
    const shifts = await prisma.caregiverShift.findMany({
      where: {
        startTime: {
          gte: now,
          lte: addMinutes(now, maxMinutes + 60),
        },
        status: 'SCHEDULED',
      },
      include: { 
        careRecipient: {
          select: { id: true }
        }, 
        caregiver: {
          select: { id: true, timezone: true }
        }
      },
    });

    let queued = 0;

    for (const shift of shifts) {
      for (const minutesBefore of REMINDER_CONFIG.shiftReminderMinutes) {
        const reminderTime = addMinutes(shift.startTime, -minutesBefore);
        
        if (isWithinInterval(now, {
          start: startOfMinute(reminderTime),
          end: endOfMinute(reminderTime),
        })) {
          const jobId = `shift-${shift.id}-${minutesBefore}`;
          
          await shiftQueue.add(
            'shift-reminder',
            {
              shiftId: shift.id,
              careRecipientId: shift.careRecipientId,
              caregiverId: shift.caregiverId,
              startTime: shift.startTime.toISOString(),
              minutesBefore,
            },
            { 
              jobId,
              ...getDefaultJobOptions(),
            }
          );
          queued++;
        }
      }
    }

    if (queued > 0) {
      logger.debug({ count: queued }, 'Shift reminders queued');
    }
  }

  private async checkRefillAlerts(now: Date): Promise<void> {
    // Only check once per hour (at the start of each hour)
    if (now.getMinutes() !== 0) {
      return;
    }

    // Get medications where currentSupply <= refillAt
    const lowSupplyMeds = await prisma.medication.findMany({
      where: {
        isActive: true,
        refillAt: { not: null },
        currentSupply: { not: null },
      },
      include: {
        careRecipient: {
          include: {
            family: {
              include: {
                members: {
                  where: { isActive: true },
                  select: { userId: true },
                },
              },
            },
          },
        },
      },
    });

    let queued = 0;

    for (const med of lowSupplyMeds) {
      // Check if supply is at or below refill threshold
      if (
        med.currentSupply !== null && 
        med.refillAt !== null && 
        med.currentSupply <= med.refillAt
      ) {
        // Use date-based job ID to only send one alert per day per medication
        const today = startOfDay(now).toISOString().split('T')[0];
        const jobId = `refill-${med.id}-${today}`;

        const careRecipientName = med.careRecipient.fullName;
        const familyMemberUserIds = med.careRecipient.family.members.map((m: { userId: string }) => m.userId);

        if (familyMemberUserIds.length === 0) {
          continue;
        }

        await refillAlertQueue.add(
          'refill-alert',
          {
            medicationId: med.id,
            medicationName: med.name,
            currentSupply: med.currentSupply,
            refillAt: med.refillAt,
            careRecipientId: med.careRecipientId,
            careRecipientName,
            familyMemberUserIds,
          },
          { 
            jobId, 
            // Don't retry if already processed today
            attempts: 1,
            removeOnComplete: true,
          }
        );
        queued++;

        logger.info({
          medicationId: med.id,
          medicationName: med.name,
          currentSupply: med.currentSupply,
          refillAt: med.refillAt,
        }, 'Refill alert queued');
      }
    }

    if (queued > 0) {
      logger.info({ count: queued }, 'Refill alerts queued');
    }
  }
}

export const reminderScheduler = new ReminderScheduler();
