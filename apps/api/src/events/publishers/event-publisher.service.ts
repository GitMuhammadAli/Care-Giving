import { Injectable, Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { v4 as uuidv4 } from 'uuid';

import { OutboxService, CreateOutboxEventOptions } from '../outbox/outbox.service';
import { EXCHANGES, ROUTING_KEYS, RoutingKey } from '../events.constants';
import { BaseEvent } from '../dto/events.dto';

export interface PublishOptions {
  /** Use outbox pattern (default: true) - recommended for domain events */
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
 * Provides two modes of publishing:
 * 1. Direct publish - Immediate publish to RabbitMQ (for non-critical events)
 * 2. Outbox pattern - Stores event in DB first (for domain events that must not be lost)
 * 
 * Usage:
 * 
 * ```typescript
 * // Domain event (uses outbox by default)
 * await eventPublisher.publish(
 *   ROUTING_KEYS.MEDICATION_LOGGED,
 *   payload,
 *   { aggregateType: 'Medication', aggregateId: medicationId }
 * );
 * 
 * // Notification (direct publish, non-critical)
 * await eventPublisher.publishDirect(
 *   ROUTING_KEYS.NOTIFY_PUSH,
 *   payload,
 *   { exchange: EXCHANGES.NOTIFICATIONS }
 * );
 * ```
 */
@Injectable()
export class EventPublisherService {
  private readonly logger = new Logger(EventPublisherService.name);

  constructor(
    private readonly amqpConnection: AmqpConnection,
    private readonly outboxService: OutboxService,
  ) {}

  /**
   * Publish a domain event using the outbox pattern
   * This ensures the event is stored in the same transaction as domain changes.
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
      useOutbox = true,
      correlationId = uuidv4(),
      causedBy,
      familyId,
      careRecipientId,
      exchange = EXCHANGES.DOMAIN_EVENTS,
    } = options;

    if (useOutbox) {
      // Store in outbox (will be picked up by OutboxProcessor)
      await this.outboxService.createEvent({
        eventType,
        exchange,
        routingKey: eventType,
        payload,
        aggregateType: meta.aggregateType,
        aggregateId: meta.aggregateId,
        correlationId,
        causedBy,
        familyId,
        careRecipientId,
      });

      this.logger.debug(
        `Event queued in outbox: ${eventType} for ${meta.aggregateType}:${meta.aggregateId}`,
      );
    } else {
      // Direct publish (fire-and-forget)
      await this.publishDirect(eventType, payload, {
        correlationId,
        causedBy,
        familyId,
        careRecipientId,
        exchange,
      });
    }
  }

  /**
   * Publish directly to RabbitMQ (bypasses outbox)
   * Use for non-critical events that can be lost if broker is unavailable.
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

      this.logger.debug(`Published event directly: ${eventType}`);
    } catch (error) {
      this.logger.error(`Failed to publish event ${eventType}:`, error);
      throw error;
    }
  }

  /**
   * Publish a notification event (direct, to notification exchange)
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
    }, { ...options, useOutbox: false }); // Reminders can use direct publish
  }

  async publishEmergencyAlert(
    alertId: string,
    payload: Record<string, unknown>,
    options?: PublishOptions,
  ): Promise<void> {
    // Emergency alerts MUST use outbox for reliability
    await this.publish(ROUTING_KEYS.EMERGENCY_ALERT_CREATED, payload, {
      aggregateType: 'EmergencyAlert',
      aggregateId: alertId,
    }, { ...options, useOutbox: true });
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
    }, { ...options, useOutbox: false }); // Reminders can use direct publish
  }
}

