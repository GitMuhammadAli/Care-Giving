import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe, Nack } from '@golevelup/nestjs-rabbitmq';

import { EXCHANGES, QUEUES, ROUTING_KEYS } from '../events.constants';
import {
  BaseEvent,
  PushNotificationPayload,
  EmailNotificationPayload,
  CareRecipientDeletedPayload,
  CareRecipientUpdatedPayload,
  FamilyMemberRemovedPayload,
  FamilyMemberRoleUpdatedPayload,
  MedicationDeletedPayload,
  AppointmentDeletedPayload,
  FamilyDeletedPayload,
} from '../dto/events.dto';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Notification Consumer
 *
 * Consumes notification events from RabbitMQ and dispatches them
 * to the appropriate notification services (Push, Email, SMS).
 * 
 * Note: Push notifications are handled by the workers package.
 * This consumer creates in-app notifications in the database.
 */
@Injectable()
export class NotificationConsumer {
  private readonly logger = new Logger(NotificationConsumer.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Handle push notification requests - creates in-app notification
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.NOTIFICATIONS,
    routingKey: ROUTING_KEYS.NOTIFY_PUSH,
    queue: QUEUES.PUSH_NOTIFICATIONS,
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER,
        'x-dead-letter-routing-key': QUEUES.DLQ_NOTIFICATIONS,
      },
    },
  })
  async handlePushNotification(
    event: BaseEvent<PushNotificationPayload>,
  ): Promise<void | Nack> {
    try {
      this.logger.debug(`Processing push notification for user: ${event.data.userId}`);

      // Create in-app notification
      await this.prisma.notification.create({
        data: {
          userId: event.data.userId,
          type: 'GENERAL',
          title: event.data.title,
          body: event.data.body,
          data: (event.data.data || {}) as any,
        },
      });

      this.logger.log(
        `Notification created: "${event.data.title}" for user ${event.data.userId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to create notification: ${error}`);

      if (this.isTransientError(error)) {
        return new Nack(true);
      }

      return new Nack(false);
    }
  }

  /**
   * Handle email notification requests
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.NOTIFICATIONS,
    routingKey: ROUTING_KEYS.NOTIFY_EMAIL,
    queue: QUEUES.EMAIL_NOTIFICATIONS,
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER,
        'x-dead-letter-routing-key': QUEUES.DLQ_NOTIFICATIONS,
      },
    },
  })
  async handleEmailNotification(
    event: BaseEvent<EmailNotificationPayload>,
  ): Promise<void | Nack> {
    try {
      this.logger.debug(`Processing email notification to: ${event.data.to}`);

      // TODO: Inject and use MailService when available
      // await this.mailService.sendTemplate(event.data);

      this.logger.log(
        `Email notification logged: "${event.data.subject}" to ${event.data.to}`,
      );
    } catch (error) {
      this.logger.error(`Failed to process email notification: ${error}`);

      if (this.isTransientError(error)) {
        return new Nack(true);
      }

      return new Nack(false);
    }
  }

  /**
   * Handle emergency alert notifications (highest priority)
   * These are processed from the domain events exchange
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.DOMAIN_EVENTS,
    routingKey: ROUTING_KEYS.EMERGENCY_ALERT_CREATED,
    queue: QUEUES.EMERGENCY_PROCESSOR,
    queueOptions: {
      durable: true,
      arguments: {
        'x-max-priority': 10, // Enable priority queue
      },
    },
  })
  async handleEmergencyAlert(event: BaseEvent): Promise<void | Nack> {
    try {
      this.logger.warn(`🚨 EMERGENCY ALERT: Processing emergency for care recipient`);

      const data = event.data as {
        familyMemberIds: string[];
        careRecipientName: string;
        type: string;
        description?: string;
        location?: string;
      };

      // Create emergency notifications for all family members
      await this.prisma.notification.createMany({
        data: data.familyMemberIds.map((userId) => ({
          userId,
          type: 'EMERGENCY_ALERT' as const,
          title: `🚨 EMERGENCY: ${data.type}`,
          body: `${data.careRecipientName}: ${data.description || data.type}${data.location ? ` at ${data.location}` : ''}`,
          data: { type: data.type, location: data.location },
        })),
      });

      this.logger.log(`Emergency notifications created for ${data.familyMemberIds.length} family members`);
    } catch (error) {
      this.logger.error(`Failed to process emergency alert: ${error}`);
      // Emergency alerts should always be requeued
      return new Nack(true);
    }
  }

  /**
   * Handle medication logged events for family notifications
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.DOMAIN_EVENTS,
    routingKey: 'medication.logged',
    queue: QUEUES.PUSH_NOTIFICATIONS,
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER,
        'x-dead-letter-routing-key': QUEUES.DLQ_NOTIFICATIONS,
      },
    },
  })
  async handleMedicationLogged(event: BaseEvent): Promise<void | Nack> {
    try {
      const data = event.data as {
        familyId: string;
        medicationName: string;
        careRecipientName: string;
        loggedByName: string;
        status: string;
        loggedById: string;
      };

      // Get all family members except the one who logged it
      const members = await this.prisma.familyMember.findMany({
        where: { familyId: data.familyId, userId: { not: data.loggedById } },
        select: { userId: true },
      });

      if (members.length > 0) {
        await this.prisma.notification.createMany({
          data: members.map((m) => ({
            userId: m.userId,
            type: 'GENERAL' as const,
            title: '💊 Medication Logged',
            body: `${data.loggedByName} logged ${data.medicationName} for ${data.careRecipientName} as ${data.status}`,
            data: { medicationName: data.medicationName, status: data.status },
          })),
        });
      }

      this.logger.log(`Medication notification sent to family ${data.familyId}`);
    } catch (error) {
      this.logger.error(`Failed to send medication notification: ${error}`);
      return new Nack(this.isTransientError(error));
    }
  }

  /**
   * Handle shift check-in/check-out events
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.DOMAIN_EVENTS,
    routingKey: 'shift.*',
    queue: QUEUES.PUSH_NOTIFICATIONS,
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER,
        'x-dead-letter-routing-key': QUEUES.DLQ_NOTIFICATIONS,
      },
    },
  })
  async handleShiftEvent(event: BaseEvent): Promise<void | Nack> {
    try {
      const data = event.data as {
        familyId: string;
        caregiverName: string;
        careRecipientName: string;
        eventType: 'checkedIn' | 'checkedOut';
        handoffNotes?: string;
      };

      let title = '';
      let body = '';

      if (data.eventType === 'checkedIn') {
        title = '👨‍⚕️ Shift Started';
        body = `${data.caregiverName} has checked in for ${data.careRecipientName}`;
      } else {
        title = '👋 Shift Ended';
        body = `${data.caregiverName} has checked out`;
        if (data.handoffNotes) {
          body += `. Handoff notes: ${data.handoffNotes}`;
        }
      }

      const members = await this.prisma.familyMember.findMany({
        where: { familyId: data.familyId },
        select: { userId: true },
      });

      if (members.length > 0) {
        await this.prisma.notification.createMany({
          data: members.map((m) => ({
            userId: m.userId,
            type: 'SHIFT_REMINDER' as const,
            title,
            body,
            data: { eventType: data.eventType, handoffNotes: data.handoffNotes },
          })),
        });
      }

      this.logger.log(`Shift notification sent to family ${data.familyId}`);
    } catch (error) {
      this.logger.error(`Failed to send shift notification: ${error}`);
      return new Nack(this.isTransientError(error));
    }
  }

  /**
   * Handle appointment reminder events
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.DOMAIN_EVENTS,
    routingKey: 'appointment.reminder',
    queue: QUEUES.PUSH_NOTIFICATIONS,
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER,
        'x-dead-letter-routing-key': QUEUES.DLQ_NOTIFICATIONS,
      },
    },
  })
  async handleAppointmentReminder(event: BaseEvent): Promise<void | Nack> {
    try {
      const data = event.data as {
        familyMemberIds: string[];
        appointmentTitle: string;
        careRecipientName: string;
        appointmentTime: string;
        timeUntil: string;
      };

      await this.prisma.notification.createMany({
        data: data.familyMemberIds.map((userId) => ({
          userId,
          type: 'APPOINTMENT_REMINDER' as const,
          title: '📅 Appointment Reminder',
          body: `${data.appointmentTitle} for ${data.careRecipientName} in ${data.timeUntil}`,
          data: { appointmentTime: data.appointmentTime },
        })),
      });

      this.logger.log(`Appointment reminder sent to ${data.familyMemberIds.length} users`);
    } catch (error) {
      this.logger.error(`Failed to send appointment reminder: ${error}`);
      return new Nack(this.isTransientError(error));
    }
  }

  /**
   * Handle medication reminder events
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.DOMAIN_EVENTS,
    routingKey: 'medication.reminder',
    queue: QUEUES.PUSH_NOTIFICATIONS,
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER,
        'x-dead-letter-routing-key': QUEUES.DLQ_NOTIFICATIONS,
      },
    },
  })
  async handleMedicationReminder(event: BaseEvent): Promise<void | Nack> {
    try {
      const data = event.data as {
        familyMemberIds: string[];
        medicationName: string;
        careRecipientName: string;
        scheduledTime: string;
      };

      await this.prisma.notification.createMany({
        data: data.familyMemberIds.map((userId) => ({
          userId,
          type: 'MEDICATION_REMINDER' as const,
          title: '💊 Medication Reminder',
          body: `Time to give ${data.medicationName} to ${data.careRecipientName}`,
          data: { medicationName: data.medicationName, scheduledTime: data.scheduledTime },
        })),
      });

      this.logger.log(`Medication reminder sent to ${data.familyMemberIds.length} users`);
    } catch (error) {
      this.logger.error(`Failed to send medication reminder: ${error}`);
      return new Nack(this.isTransientError(error));
    }
  }

  // ============================================================================
  // ADMIN ACTION EVENT HANDLERS
  // ============================================================================

  /**
   * Handle care recipient deleted event
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.DOMAIN_EVENTS,
    routingKey: ROUTING_KEYS.CARE_RECIPIENT_DELETED,
    queue: QUEUES.PUSH_NOTIFICATIONS,
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER,
        'x-dead-letter-routing-key': QUEUES.DLQ_NOTIFICATIONS,
      },
    },
  })
  async handleCareRecipientDeleted(event: BaseEvent<CareRecipientDeletedPayload>): Promise<void | Nack> {
    try {
      const data = event.data;

      if (data.affectedUserIds.length > 0) {
        await this.prisma.notification.createMany({
          data: data.affectedUserIds.map((userId) => ({
            userId,
            type: 'CARE_RECIPIENT_DELETED' as const,
            title: 'Care Recipient Removed',
            body: `${data.deletedByName} removed ${data.careRecipientName} from the family.`,
            data: {
              careRecipientId: data.careRecipientId,
              careRecipientName: data.careRecipientName,
              actionBy: data.deletedByName,
            },
          })),
        });
      }

      this.logger.log(`Care recipient deleted notification sent to ${data.affectedUserIds.length} users`);
    } catch (error) {
      this.logger.error(`Failed to handle care recipient deleted: ${error}`);
      return new Nack(this.isTransientError(error));
    }
  }

  /**
   * Handle care recipient updated event
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.DOMAIN_EVENTS,
    routingKey: ROUTING_KEYS.CARE_RECIPIENT_UPDATED,
    queue: QUEUES.PUSH_NOTIFICATIONS,
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER,
        'x-dead-letter-routing-key': QUEUES.DLQ_NOTIFICATIONS,
      },
    },
  })
  async handleCareRecipientUpdated(event: BaseEvent<CareRecipientUpdatedPayload>): Promise<void | Nack> {
    try {
      const data = event.data;

      if (data.affectedUserIds.length > 0) {
        const changesText = data.changes.join(', ');
        await this.prisma.notification.createMany({
          data: data.affectedUserIds.map((userId) => ({
            userId,
            type: 'CARE_RECIPIENT_UPDATED' as const,
            title: 'Care Recipient Updated',
            body: `${data.updatedByName} updated ${data.careRecipientName}'s information (${changesText}).`,
            data: {
              careRecipientId: data.careRecipientId,
              careRecipientName: data.careRecipientName,
              changes: data.changes,
              actionBy: data.updatedByName,
            },
          })),
        });
      }

      this.logger.log(`Care recipient updated notification sent`);
    } catch (error) {
      this.logger.error(`Failed to handle care recipient updated: ${error}`);
      return new Nack(this.isTransientError(error));
    }
  }

  /**
   * Handle family member removed - notify both removed user AND remaining members
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.DOMAIN_EVENTS,
    routingKey: ROUTING_KEYS.FAMILY_MEMBER_REMOVED,
    queue: QUEUES.PUSH_NOTIFICATIONS,
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER,
        'x-dead-letter-routing-key': QUEUES.DLQ_NOTIFICATIONS,
      },
    },
  })
  async handleFamilyMemberRemoved(event: BaseEvent<FamilyMemberRemovedPayload>): Promise<void | Nack> {
    try {
      const data = event.data;

      // Notify the removed user
      await this.prisma.notification.create({
        data: {
          userId: data.removedUserId,
          type: 'FAMILY_MEMBER_REMOVED' as const,
          title: 'Removed from Family',
          body: `You have been removed from ${data.familyName} by ${data.removedByName}.`,
          data: {
            familyId: data.familyId,
            familyName: data.familyName,
            removedBy: data.removedByName,
          },
        },
      });

      // Notify remaining family members (except the admin who did it)
      const membersToNotify = data.remainingMemberIds.filter((id) => id !== data.removedById);
      if (membersToNotify.length > 0) {
        await this.prisma.notification.createMany({
          data: membersToNotify.map((userId) => ({
            userId,
            type: 'FAMILY_MEMBER_REMOVED' as const,
            title: 'Family Member Removed',
            body: `${data.removedByName} removed ${data.memberName} from ${data.familyName}.`,
            data: {
              familyId: data.familyId,
              memberName: data.memberName,
              removedBy: data.removedByName,
            },
          })),
        });
      }

      this.logger.log(`Family member removed notification sent`);
    } catch (error) {
      this.logger.error(`Failed to handle family member removed: ${error}`);
      return new Nack(this.isTransientError(error));
    }
  }

  /**
   * Handle family member role updated - notify affected user
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.DOMAIN_EVENTS,
    routingKey: ROUTING_KEYS.FAMILY_MEMBER_ROLE_UPDATED,
    queue: QUEUES.PUSH_NOTIFICATIONS,
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER,
        'x-dead-letter-routing-key': QUEUES.DLQ_NOTIFICATIONS,
      },
    },
  })
  async handleFamilyMemberRoleUpdated(event: BaseEvent<FamilyMemberRoleUpdatedPayload>): Promise<void | Nack> {
    try {
      const data = event.data;

      // Notify the affected user (whose role changed)
      await this.prisma.notification.create({
        data: {
          userId: data.memberUserId,
          type: 'FAMILY_MEMBER_ROLE_CHANGED' as const,
          title: 'Role Updated',
          body: `Your role in ${data.familyName} has been changed from ${data.oldRole} to ${data.newRole} by ${data.updatedByName}.`,
          data: {
            familyId: data.familyId,
            familyName: data.familyName,
            oldRole: data.oldRole,
            newRole: data.newRole,
            changedBy: data.updatedByName,
          },
        },
      });

      this.logger.log(`Role change notification sent to user ${data.memberUserId}`);
    } catch (error) {
      this.logger.error(`Failed to handle role update: ${error}`);
      return new Nack(this.isTransientError(error));
    }
  }

  /**
   * Handle medication deleted
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.DOMAIN_EVENTS,
    routingKey: ROUTING_KEYS.MEDICATION_DELETED,
    queue: QUEUES.PUSH_NOTIFICATIONS,
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER,
        'x-dead-letter-routing-key': QUEUES.DLQ_NOTIFICATIONS,
      },
    },
  })
  async handleMedicationDeleted(event: BaseEvent<MedicationDeletedPayload>): Promise<void | Nack> {
    try {
      const data = event.data;

      if (data.affectedUserIds.length > 0) {
        await this.prisma.notification.createMany({
          data: data.affectedUserIds.map((userId) => ({
            userId,
            type: 'MEDICATION_DELETED' as const,
            title: 'Medication Removed',
            body: `${data.deletedByName} removed ${data.medicationName} from ${data.careRecipientName}'s medications.`,
            data: {
              medicationId: data.medicationId,
              medicationName: data.medicationName,
              careRecipientName: data.careRecipientName,
              deletedBy: data.deletedByName,
            },
          })),
        });
      }

      this.logger.log(`Medication deleted notification sent`);
    } catch (error) {
      this.logger.error(`Failed to handle medication deleted: ${error}`);
      return new Nack(this.isTransientError(error));
    }
  }

  /**
   * Handle appointment deleted
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.DOMAIN_EVENTS,
    routingKey: ROUTING_KEYS.APPOINTMENT_DELETED,
    queue: QUEUES.PUSH_NOTIFICATIONS,
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER,
        'x-dead-letter-routing-key': QUEUES.DLQ_NOTIFICATIONS,
      },
    },
  })
  async handleAppointmentDeleted(event: BaseEvent<AppointmentDeletedPayload>): Promise<void | Nack> {
    try {
      const data = event.data;

      if (data.affectedUserIds.length > 0) {
        await this.prisma.notification.createMany({
          data: data.affectedUserIds.map((userId) => ({
            userId,
            type: 'APPOINTMENT_DELETED' as const,
            title: 'Appointment Deleted',
            body: `${data.deletedByName} deleted "${data.appointmentTitle}" for ${data.careRecipientName}.`,
            data: {
              appointmentId: data.appointmentId,
              appointmentTitle: data.appointmentTitle,
              careRecipientName: data.careRecipientName,
              originalDateTime: data.originalDateTime,
              deletedBy: data.deletedByName,
            },
          })),
        });
      }

      this.logger.log(`Appointment deleted notification sent`);
    } catch (error) {
      this.logger.error(`Failed to handle appointment deleted: ${error}`);
      return new Nack(this.isTransientError(error));
    }
  }

  /**
   * Handle family deleted
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.DOMAIN_EVENTS,
    routingKey: ROUTING_KEYS.FAMILY_DELETED,
    queue: QUEUES.PUSH_NOTIFICATIONS,
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER,
        'x-dead-letter-routing-key': QUEUES.DLQ_NOTIFICATIONS,
      },
    },
  })
  async handleFamilyDeleted(event: BaseEvent<FamilyDeletedPayload>): Promise<void | Nack> {
    try {
      const data = event.data;

      // Notify all affected users except the one who deleted
      const usersToNotify = data.affectedUserIds.filter((id) => id !== data.deletedById);

      if (usersToNotify.length > 0) {
        await this.prisma.notification.createMany({
          data: usersToNotify.map((userId) => ({
            userId,
            type: 'FAMILY_DELETED' as const,
            title: 'Family Deleted',
            body: `${data.deletedByName} has deleted the family "${data.familyName}". All associated data has been removed.`,
            data: {
              familyName: data.familyName,
              deletedBy: data.deletedByName,
            },
          })),
        });
      }

      this.logger.log(`Family deleted notification sent to ${usersToNotify.length} users`);
    } catch (error) {
      this.logger.error(`Failed to handle family deleted: ${error}`);
      return new Nack(this.isTransientError(error));
    }
  }

  /**
   * Determine if an error is transient (worth retrying)
   */
  private isTransientError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('timeout') ||
        message.includes('connection') ||
        message.includes('econnrefused') ||
        message.includes('rate limit') ||
        message.includes('temporarily')
      );
    }
    return false;
  }
}
