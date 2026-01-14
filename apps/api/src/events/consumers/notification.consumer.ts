import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe, Nack } from '@golevelup/nestjs-rabbitmq';

import { EXCHANGES, QUEUES, ROUTING_KEYS } from '../events.constants';
import {
  BaseEvent,
  PushNotificationPayload,
  EmailNotificationPayload,
} from '../dto/events.dto';
import { NotificationsService } from '../../notifications/service/notifications.service';

/**
 * Notification Consumer
 *
 * Consumes notification events from RabbitMQ and dispatches them
 * to the appropriate notification services (Push, Email, SMS).
 */
@Injectable()
export class NotificationConsumer {
  private readonly logger = new Logger(NotificationConsumer.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Handle push notification requests
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.NOTIFICATIONS,
    routingKey: ROUTING_KEYS.NOTIFY_PUSH,
    queue: QUEUES.PUSH_NOTIFICATIONS,
    queueOptions: {
      durable: true,
    },
  })
  async handlePushNotification(
    event: BaseEvent<PushNotificationPayload>,
  ): Promise<void | Nack> {
    try {
      this.logger.debug(`Processing push notification for user: ${event.data.userId}`);

      // Send push notification using NotificationsService
      await this.notificationsService.sendPushNotification(
        [event.data.userId],
        event.data.title,
        event.data.body,
        event.data.data,
      );

      this.logger.log(
        `Push notification sent: "${event.data.title}" to user ${event.data.userId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send push notification: ${error}`);

      // Requeue if it's a transient error
      if (this.isTransientError(error)) {
        return new Nack(true);
      }

      // Don't requeue for permanent failures
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
        `Email sent: "${event.data.subject}" to ${event.data.to}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send email: ${error}`);

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

      // Send emergency push notifications to all family members
      await this.notificationsService.sendEmergencyAlert(
        data.familyMemberIds,
        data.careRecipientName,
        data.type,
        data.location,
      );

      // TODO: Send SMS to family members with phone numbers
      // TODO: Send email to family members

      this.logger.log(`Emergency notifications dispatched for ${data.familyMemberIds.length} family members`);
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

      // Notify family members (excluding the person who logged it)
      await this.notificationsService.notifyFamily(
        data.familyId,
        'MEDICATION_LOGGED' as any,
        '💊 Medication Logged',
        `${data.loggedByName} logged ${data.medicationName} for ${data.careRecipientName} as ${data.status}`,
        { medicationName: data.medicationName, status: data.status },
        data.loggedById,
      );

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

      await this.notificationsService.notifyFamily(
        data.familyId,
        'SHIFT_UPDATE' as any,
        title,
        body,
        { eventType: data.eventType, handoffNotes: data.handoffNotes },
      );

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

      await this.notificationsService.sendPushNotification(
        data.familyMemberIds,
        `📅 Appointment Reminder`,
        `${data.appointmentTitle} for ${data.careRecipientName} in ${data.timeUntil}`,
        { appointmentTime: data.appointmentTime },
      );

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

      await this.notificationsService.sendPushNotification(
        data.familyMemberIds,
        `💊 Medication Reminder`,
        `Time to give ${data.medicationName} to ${data.careRecipientName}`,
        { medicationName: data.medicationName, scheduledTime: data.scheduledTime },
      );

      this.logger.log(`Medication reminder sent to ${data.familyMemberIds.length} users`);
    } catch (error) {
      this.logger.error(`Failed to send medication reminder: ${error}`);
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
