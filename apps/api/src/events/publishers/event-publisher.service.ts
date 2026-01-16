import { Injectable, Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { v4 as uuidv4 } from 'uuid';

import { EXCHANGES, ROUTING_KEYS, RoutingKey } from '../events.constants';
import { BaseEvent } from '../dto/events.dto';

export interface PublishOptions {
  /** Use outbox pattern - currently not implemented, all publishes are direct */
  useOutbox?: boolean;
  /** Correlation ID for distributed tracing */
  correlationId?: string;
  /** User ID who caused this event */
  causedBy?: string;
  /** Family ID for multi-tenancy */
  familyId?: string;
  /** Care recipient ID */
  careRecipientId?: string;
  /** Target exchange (defaults to DOMAIN_EVENTS) */
  exchange?: string;
}

/**
 * Event Publisher Service
 * 
 * Publishes events directly to RabbitMQ.
 * 
 * Usage:
 * 
 * ```typescript
 * // Domain event
 * await eventPublisher.publish(
 *   ROUTING_KEYS.MEDICATION_LOGGED,
 *   payload,
 *   { aggregateType: 'Medication', aggregateId: medicationId }
 * );
 * 
 * // Notification
 * await eventPublisher.publishNotification(
 *   'push',
 *   payload,
 *   { correlationId: '...' }
 * );
 * ```
 */
@Injectable()
export class EventPublisherService {
  private readonly logger = new Logger(EventPublisherService.name);

  constructor(private readonly amqpConnection: AmqpConnection) {}

  /**
   * Publish a domain event
   */
  async publish<T extends Record<string, unknown>>(
    eventType: RoutingKey,
    payload: T,
    meta: {
      aggregateType: string;
      aggregateId: string;
    },
    options: PublishOptions = {},
  ): Promise<void> {
    const {
      correlationId = uuidv4(),
      causedBy,
      familyId,
      careRecipientId,
      exchange = EXCHANGES.DOMAIN_EVENTS,
    } = options;

    await this.publishDirect(eventType, payload, {
      correlationId,
      causedBy,
      familyId,
      careRecipientId,
      exchange,
    });

    this.logger.debug(
      `Published event: ${eventType} for ${meta.aggregateType}:${meta.aggregateId}`,
    );
  }

  /**
   * Publish directly to RabbitMQ
   */
  async publishDirect<T extends Record<string, unknown>>(
    eventType: RoutingKey,
    payload: T,
    options: PublishOptions = {},
  ): Promise<void> {
    const {
      correlationId = uuidv4(),
      causedBy,
      familyId,
      careRecipientId,
      exchange = EXCHANGES.DOMAIN_EVENTS,
    } = options;

    const event: BaseEvent<T> = {
      id: uuidv4(),
      type: eventType,
      source: 'carecircle-api',
      timestamp: new Date().toISOString(),
      specVersion: '1.0',
      data: payload,
      correlationId,
      causedBy,
      familyId,
      careRecipientId,
    };

    try {
      await this.amqpConnection.publish(exchange, eventType, event, {
        persistent: true,
        contentType: 'application/json',
        messageId: event.id,
        correlationId,
        timestamp: Date.now(),
        headers: {
          'x-event-type': eventType,
        },
      });

      this.logger.debug(`Published event: ${eventType}`);
    } catch (error) {
      this.logger.error(`Failed to publish event ${eventType}:`, error);
      throw error;
    }
  }

  /**
   * Publish a notification event (to notification exchange)
   */
  async publishNotification<T extends Record<string, unknown>>(
    type: 'push' | 'email' | 'sms',
    payload: T,
    options: Omit<PublishOptions, 'useOutbox' | 'exchange'> = {},
  ): Promise<void> {
    const routingKey = {
      push: ROUTING_KEYS.NOTIFY_PUSH,
      email: ROUTING_KEYS.NOTIFY_EMAIL,
      sms: ROUTING_KEYS.NOTIFY_SMS,
    }[type];

    await this.publishDirect(routingKey, payload, {
      ...options,
      exchange: EXCHANGES.NOTIFICATIONS,
    });
  }

  /**
   * Publish to audit exchange (fanout)
   */
  async publishAuditEvent<T extends Record<string, unknown>>(
    eventType: string,
    payload: T,
    options: PublishOptions = {},
  ): Promise<void> {
    const event: BaseEvent<T> = {
      id: uuidv4(),
      type: eventType,
      source: 'carecircle-api',
      timestamp: new Date().toISOString(),
      specVersion: '1.0',
      data: payload,
      correlationId: options.correlationId || uuidv4(),
      causedBy: options.causedBy,
    };

    try {
      await this.amqpConnection.publish(
        EXCHANGES.AUDIT,
        '', // Fanout exchange ignores routing key
        event,
        {
          persistent: true,
          contentType: 'application/json',
        },
      );
    } catch (error) {
      // Audit failures should not break the application
      this.logger.warn(`Failed to publish audit event: ${error}`);
    }
  }

  // ============================================================================
  // CONVENIENCE METHODS FOR DOMAIN EVENTS
  // ============================================================================

  async publishMedicationLogged(
    medicationId: string,
    payload: Record<string, unknown>,
    options?: PublishOptions,
  ): Promise<void> {
    await this.publish(ROUTING_KEYS.MEDICATION_LOGGED, payload, {
      aggregateType: 'Medication',
      aggregateId: medicationId,
    }, options);
  }

  async publishMedicationDue(
    medicationId: string,
    payload: Record<string, unknown>,
    options?: PublishOptions,
  ): Promise<void> {
    await this.publish(ROUTING_KEYS.MEDICATION_DUE, payload, {
      aggregateType: 'Medication',
      aggregateId: medicationId,
    }, options);
  }

  async publishEmergencyAlert(
    alertId: string,
    payload: Record<string, unknown>,
    options?: PublishOptions,
  ): Promise<void> {
    await this.publish(ROUTING_KEYS.EMERGENCY_ALERT_CREATED, payload, {
      aggregateType: 'EmergencyAlert',
      aggregateId: alertId,
    }, options);
  }

  async publishShiftStarted(
    shiftId: string,
    payload: Record<string, unknown>,
    options?: PublishOptions,
  ): Promise<void> {
    await this.publish(ROUTING_KEYS.SHIFT_STARTED, payload, {
      aggregateType: 'CaregiverShift',
      aggregateId: shiftId,
    }, options);
  }

  async publishShiftEnded(
    shiftId: string,
    payload: Record<string, unknown>,
    options?: PublishOptions,
  ): Promise<void> {
    await this.publish(ROUTING_KEYS.SHIFT_ENDED, payload, {
      aggregateType: 'CaregiverShift',
      aggregateId: shiftId,
    }, options);
  }

  async publishTimelineEntry(
    entryId: string,
    payload: Record<string, unknown>,
    options?: PublishOptions,
  ): Promise<void> {
    await this.publish(ROUTING_KEYS.TIMELINE_ENTRY_CREATED, payload, {
      aggregateType: 'TimelineEntry',
      aggregateId: entryId,
    }, options);
  }

  async publishAppointmentReminder(
    appointmentId: string,
    payload: Record<string, unknown>,
    options?: PublishOptions,
  ): Promise<void> {
    await this.publish(ROUTING_KEYS.APPOINTMENT_REMINDER, payload, {
      aggregateType: 'Appointment',
      aggregateId: appointmentId,
    }, options);
  }
}
