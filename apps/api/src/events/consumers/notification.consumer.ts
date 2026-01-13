import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe, Nack } from '@golevelup/nestjs-rabbitmq';

import { EXCHANGES, QUEUES, ROUTING_KEYS } from '../events.constants';
import {
  BaseEvent,
  PushNotificationPayload,
  EmailNotificationPayload,
} from '../dto/events.dto';

/**
 * Notification Consumer
 * 
 * Consumes notification events from RabbitMQ and dispatches them
 * to the appropriate notification services (Push, Email, SMS).
 */
@Injectable()
export class NotificationConsumer {
  private readonly logger = new Logger(NotificationConsumer.name);

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
      
      // TODO: Inject and use PushNotificationService
      // await this.pushService.send(event.data);
      
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
      
      // TODO: Inject and use MailService
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
      };

      // Send push notifications to all family members
      for (const userId of data.familyMemberIds) {
        // TODO: Inject and use PushNotificationService
        this.logger.log(`Sending emergency push to user: ${userId}`);
      }

      // Send SMS to family members with phone numbers
      // TODO: Inject and use SmsService

      // Send email to family members
      // TODO: Inject and use MailService

      this.logger.log(`Emergency notifications dispatched for ${data.familyMemberIds.length} family members`);
    } catch (error) {
      this.logger.error(`Failed to process emergency alert: ${error}`);
      // Emergency alerts should always be requeued
      return new Nack(true);
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

