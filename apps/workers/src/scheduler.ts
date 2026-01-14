import { prisma } from '@carecircle/database';
import { addMinutes, startOfMinute, endOfMinute, isWithinInterval, startOfDay } from 'date-fns';
import { medicationQueue, appointmentQueue, shiftQueue, refillAlertQueue } from './queues';
import { config } from './config';

class ReminderScheduler {
  private intervalId: NodeJS.Timeout | null = null;

  start() {
    console.log('📅 Reminder scheduler started');
    
    // Run immediately, then on interval
    this.checkAndQueueReminders();
    
    this.intervalId = setInterval(
      () => this.checkAndQueueReminders(),
      config.schedulerIntervalMs
    );
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('📅 Reminder scheduler stopped');
  }

  private async checkAndQueueReminders() {
    const now = new Date();
    
    await Promise.all([
      this.queueMedicationReminders(now),
      this.queueAppointmentReminders(now),
      this.queueShiftReminders(now),
      this.checkRefillAlerts(now),
    ]);
  }

  private async queueMedicationReminders(now: Date) {
    try {
      // Get all active medications
      const medications = await prisma.medication.findMany({
        where: { isActive: true },
        include: { careRecipient: true },
      });

      for (const med of medications) {
        for (const time of med.scheduledTimes) {
          const [hours, minutes] = time.split(':').map(Number);
          const scheduledTime = new Date(now);
          scheduledTime.setHours(hours, minutes, 0, 0);

          for (const minutesBefore of config.medicationReminderMinutes) {
            const reminderTime = addMinutes(scheduledTime, -minutesBefore);
            
            // Check if this reminder should be sent now (within this minute)
            if (isWithinInterval(now, {
              start: startOfMinute(reminderTime),
              end: endOfMinute(reminderTime),
            })) {
              const jobId = `med-${med.id}-${scheduledTime.toISOString()}-${minutesBefore}`;
              
              // Check if already logged for today
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
                  { jobId, removeOnComplete: true }
                );
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error queueing medication reminders:', error);
    }
  }

  private async queueAppointmentReminders(now: Date) {
    try {
      // Get upcoming appointments
      const appointments = await prisma.appointment.findMany({
        where: {
          startTime: {
            gte: now,
            lte: addMinutes(now, Math.max(...config.appointmentReminderMinutes) + 60),
          },
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
        },
        include: { careRecipient: true },
      });

      for (const apt of appointments) {
        for (const minutesBefore of config.appointmentReminderMinutes) {
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
              { jobId, removeOnComplete: true }
            );
          }
        }
      }
    } catch (error) {
      console.error('Error queueing appointment reminders:', error);
    }
  }

  private async queueShiftReminders(now: Date) {
    try {
      // Get upcoming shifts
      const shifts = await prisma.caregiverShift.findMany({
        where: {
          startTime: {
            gte: now,
            lte: addMinutes(now, Math.max(...config.shiftReminderMinutes) + 60),
          },
          status: 'SCHEDULED',
        },
        include: { careRecipient: true, caregiver: true },
      });

      for (const shift of shifts) {
        for (const minutesBefore of config.shiftReminderMinutes) {
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
              { jobId, removeOnComplete: true }
            );
          }
        }
      }
    } catch (error) {
      console.error('Error queueing shift reminders:', error);
    }
  }

  private async checkRefillAlerts(now: Date) {
    try {
      // Only check once per day (at the start of the day's first minute)
      const isStartOfDay = now.getHours() === 0 && now.getMinutes() === 0;
      
      // Check every hour for low supply meds (or always in dev for testing)
      const shouldCheck = isStartOfDay || now.getMinutes() === 0;
      if (!shouldCheck) return;

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
                    select: { userId: true },
                  },
                },
              },
            },
          },
        },
      });

      for (const med of lowSupplyMeds) {
        // Check if supply is at or below refill threshold
        if (med.currentSupply !== null && med.refillAt !== null && 
            med.currentSupply <= med.refillAt) {
          
          // Use date-based job ID to only send one alert per day per medication
          const today = startOfDay(now).toISOString().split('T')[0];
          const jobId = `refill-${med.id}-${today}`;
          
          const careRecipientName = `${med.careRecipient.firstName} ${med.careRecipient.lastName}`;
          const familyMemberUserIds = med.careRecipient.family.members.map(m => m.userId);

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
              removeOnComplete: true,
              // Don't retry if already processed today
              attempts: 1,
            }
          );

          console.log(`💊 Queued refill alert for ${med.name} (supply: ${med.currentSupply}/${med.refillAt})`);
        }
      }
    } catch (error) {
      console.error('Error checking refill alerts:', error);
    }
  }
}

export const reminderScheduler = new ReminderScheduler();

