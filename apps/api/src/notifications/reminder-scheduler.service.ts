import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { ConfigService } from '@nestjs/config';

/**
 * In-Process Reminder Scheduler
 * 
 * Handles medication, appointment, and shift reminders directly in the API process.
 * This eliminates the need for a separate worker service (perfect for free-tier).
 * 
 * Runs on a schedule using NestJS @Cron decorators.
 */
@Injectable()
export class ReminderSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(ReminderSchedulerService.name);
  private isProduction: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {
    this.isProduction = this.configService.get('app.isProduction', false);
  }

  onModuleInit() {
    this.logger.log('Reminder Scheduler initialized - running in-process');
    this.logger.log('Schedules: Medications (every min), Appointments (every 5 min), Shifts (every 5 min)');
  }

  /**
   * Check for medication reminders every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkMedicationReminders() {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

      // Find medications scheduled for this time that haven't been logged today
      const medications = await this.prisma.medication.findMany({
        where: {
          isActive: true,
          scheduledTimes: {
            has: timeStr,
          },
        },
        include: {
          careRecipient: {
            include: {
              family: {
                include: {
                  members: {
                    where: { isActive: true },
                    include: { user: true },
                  },
                },
              },
            },
          },
        },
      });

      for (const medication of medications) {
        // Check if already logged today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const existingLog = await this.prisma.medicationLog.findFirst({
          where: {
            medicationId: medication.id,
            scheduledTime: {
              gte: todayStart,
            },
          },
        });

        if (existingLog) continue; // Already handled today at this time

        // Send notification to all family members
        for (const member of medication.careRecipient.family.members) {
          try {
            await this.notificationsService.create({
              userId: member.user.id,
              title: '💊 Medication Reminder',
              body: `Time to give ${medication.name} to ${medication.careRecipient.fullName}`,
              type: 'MEDICATION_REMINDER',
              data: {
                medicationId: medication.id,
                careRecipientId: medication.careRecipient.id,
              },
            });
          } catch (err) {
            this.logger.warn(`Failed to send medication notification to ${member.user.email}: ${err.message}`);
          }
        }

        this.logger.debug(`Sent medication reminder for ${medication.name}`);
      }
    } catch (error) {
      this.logger.error(`Medication reminder check failed: ${error.message}`);
    }
  }

  /**
   * Check for appointment reminders every 5 minutes
   * Sends reminders at: 24 hours, 1 hour, and 30 minutes before
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkAppointmentReminders() {
    try {
      const now = new Date();
      const reminderWindows = [
        { minutes: 30, label: '30 minutes' },
        { minutes: 60, label: '1 hour' },
        { minutes: 1440, label: '24 hours' }, // 1 day
      ];

      for (const window of reminderWindows) {
        const targetTime = new Date(now.getTime() + window.minutes * 60 * 1000);
        const windowStart = new Date(targetTime.getTime() - 2.5 * 60 * 1000); // 2.5 min before
        const windowEnd = new Date(targetTime.getTime() + 2.5 * 60 * 1000); // 2.5 min after

        const appointments = await this.prisma.appointment.findMany({
          where: {
            startTime: {
              gte: windowStart,
              lte: windowEnd,
            },
            status: { in: ['SCHEDULED', 'CONFIRMED'] },
          },
          include: {
            careRecipient: {
              include: {
                family: {
                  include: {
                    members: {
                      where: { isActive: true },
                      include: { user: true },
                    },
                  },
                },
              },
            },
          },
        });

        for (const appointment of appointments) {
          // Check if reminder already sent for this window
          const reminderKey = `appt_${appointment.id}_${window.minutes}`;
          const existingNotification = await this.prisma.notification.findFirst({
            where: {
              data: {
                path: ['reminderKey'],
                equals: reminderKey,
              },
              createdAt: {
                gte: new Date(now.getTime() - 60 * 60 * 1000), // Last hour
              },
            },
          });

          if (existingNotification) continue;

          // Send to all family members
          for (const member of appointment.careRecipient.family.members) {
            try {
              await this.notificationsService.create({
                userId: member.user.id,
                title: '📅 Appointment Reminder',
                body: `${appointment.title} for ${appointment.careRecipient.fullName} in ${window.label}`,
                type: 'APPOINTMENT_REMINDER',
                data: {
                  appointmentId: appointment.id,
                  careRecipientId: appointment.careRecipient.id,
                  reminderKey,
                },
              });
            } catch (err) {
              this.logger.warn(`Failed to send appointment notification: ${err.message}`);
            }
          }

          this.logger.debug(`Sent appointment reminder for ${appointment.title} (${window.label} before)`);
        }
      }
    } catch (error) {
      this.logger.error(`Appointment reminder check failed: ${error.message}`);
    }
  }

  // NOTE: Shift reminders disabled - Shift model not yet implemented
  // TODO: Enable when Shift model is added to schema
  // /**
  //  * Check for shift reminders every 5 minutes
  //  * Sends reminders at: 1 hour and 15 minutes before shift starts
  //  */
  // @Cron(CronExpression.EVERY_5_MINUTES)
  // async checkShiftReminders() { ... }

  /**
   * Check for medication refills daily at 9 AM
   */
  @Cron('0 9 * * *') // Every day at 9 AM
  async checkRefillAlerts() {
    try {
      // Find all active medications and filter in code
      const allMedications = await this.prisma.medication.findMany({
        where: {
          isActive: true,
        },
        include: {
          careRecipient: {
            include: {
              family: {
                include: {
                  members: {
                    where: {
                      isActive: true,
                      role: { in: ['ADMIN', 'CAREGIVER'] },
                    },
                    include: { user: true },
                  },
                },
              },
            },
          },
        },
      });

      // Filter medications that need refill (currentSupply <= refillAt)
      const medications = allMedications.filter(
        (med) => med.currentSupply !== null && 
                 med.refillAt !== null && 
                 med.currentSupply <= med.refillAt
      );

      for (const medication of medications) {
        // Only alert once per day per medication
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const existingAlert = await this.prisma.notification.findFirst({
          where: {
            type: 'REFILL_ALERT',
            data: {
              path: ['medicationId'],
              equals: medication.id,
            },
            createdAt: {
              gte: todayStart,
            },
          },
        });

        if (existingAlert) continue;

        for (const member of medication.careRecipient.family.members) {
          try {
            await this.notificationsService.create({
              userId: member.user.id,
              title: '💊 Refill Needed',
              body: `${medication.name} for ${medication.careRecipient.fullName} is running low (${medication.currentSupply} remaining)`,
              type: 'REFILL_ALERT',
              priority: 'HIGH',
              data: {
                medicationId: medication.id,
                careRecipientId: medication.careRecipient.id,
                currentSupply: medication.currentSupply,
              },
            });
          } catch (err) {
            this.logger.warn(`Failed to send refill alert: ${err.message}`);
          }
        }

        this.logger.log(`Sent refill alert for ${medication.name}`);
      }
    } catch (error) {
      this.logger.error(`Refill alert check failed: ${error.message}`);
    }
  }
}

