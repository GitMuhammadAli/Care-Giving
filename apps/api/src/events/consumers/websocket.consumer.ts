import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe, Nack } from '@golevelup/nestjs-rabbitmq';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { EXCHANGES, QUEUES, ROUTING_KEYS } from '../events.constants';
import { BaseEvent } from '../dto/events.dto';

/**
 * WebSocket Consumer
 * 
 * Listens to domain events from RabbitMQ and emits them to the internal
 * EventEmitter, which the WebSocket Gateway subscribes to.
 * 
 * This decouples the event source (RabbitMQ) from the WebSocket broadcasting.
 */
@Injectable()
export class WebSocketConsumer {
  private readonly logger = new Logger(WebSocketConsumer.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Listen to all medication events
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.DOMAIN_EVENTS,
    routingKey: 'medication.*',
    queue: QUEUES.WEBSOCKET_UPDATES,
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER,
        'x-dead-letter-routing-key': QUEUES.DLQ_PROCESSING,
      },
    },
  })
  async handleMedicationEvent(event: BaseEvent): Promise<void | Nack> {
    try {
      this.logger.debug(`Received medication event: ${event.type}`);
      
      // Emit to internal event system for WebSocket gateway
      this.eventEmitter.emit('ws.broadcast', {
        event: event.type,
        data: event.data,
        rooms: this.getRoomsForEvent(event),
      });
    } catch (error) {
      this.logger.error(`Error handling medication event: ${error}`);
      // Return Nack to reject and requeue
      return new Nack(true);
    }
  }

  /**
   * Listen to all appointment events
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.DOMAIN_EVENTS,
    routingKey: 'appointment.*',
    queue: QUEUES.WEBSOCKET_UPDATES,
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER,
        'x-dead-letter-routing-key': QUEUES.DLQ_PROCESSING,
      },
    },
  })
  async handleAppointmentEvent(event: BaseEvent): Promise<void | Nack> {
    try {
      this.logger.debug(`Received appointment event: ${event.type}`);
      
      this.eventEmitter.emit('ws.broadcast', {
        event: event.type,
        data: event.data,
        rooms: this.getRoomsForEvent(event),
      });
    } catch (error) {
      this.logger.error(`Error handling appointment event: ${error}`);
      return new Nack(true);
    }
  }

  /**
   * Listen to emergency events (highest priority)
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.DOMAIN_EVENTS,
    routingKey: 'emergency.*',
    queue: QUEUES.WEBSOCKET_UPDATES,
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER,
        'x-dead-letter-routing-key': QUEUES.DLQ_PROCESSING,
      },
    },
  })
  async handleEmergencyEvent(event: BaseEvent): Promise<void | Nack> {
    try {
      this.logger.log(`EMERGENCY EVENT: ${event.type}`);
      
      // Emergency events are broadcast with high priority
      this.eventEmitter.emit('ws.emergency', {
        event: event.type,
        data: event.data,
        rooms: this.getRoomsForEvent(event),
      });
    } catch (error) {
      this.logger.error(`Error handling emergency event: ${error}`);
      return new Nack(true);
    }
  }

  /**
   * Listen to shift events
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.DOMAIN_EVENTS,
    routingKey: 'shift.*',
    queue: QUEUES.WEBSOCKET_UPDATES,
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER,
        'x-dead-letter-routing-key': QUEUES.DLQ_PROCESSING,
      },
    },
  })
  async handleShiftEvent(event: BaseEvent): Promise<void | Nack> {
    try {
      this.logger.debug(`Received shift event: ${event.type}`);
      
      this.eventEmitter.emit('ws.broadcast', {
        event: event.type,
        data: event.data,
        rooms: this.getRoomsForEvent(event),
      });
    } catch (error) {
      this.logger.error(`Error handling shift event: ${error}`);
      return new Nack(true);
    }
  }

  /**
   * Listen to timeline events
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.DOMAIN_EVENTS,
    routingKey: 'timeline.*',
    queue: QUEUES.WEBSOCKET_UPDATES,
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER,
        'x-dead-letter-routing-key': QUEUES.DLQ_PROCESSING,
      },
    },
  })
  async handleTimelineEvent(event: BaseEvent): Promise<void | Nack> {
    try {
      this.logger.debug(`Received timeline event: ${event.type}`);

      this.eventEmitter.emit('ws.broadcast', {
        event: event.type,
        data: event.data,
        rooms: this.getRoomsForEvent(event),
      });
    } catch (error) {
      this.logger.error(`Error handling timeline event: ${error}`);
      return new Nack(true);
    }
  }

  /**
   * Listen to family admin events (member removed, role updated, deleted)
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.DOMAIN_EVENTS,
    routingKey: 'family.*',
    queue: QUEUES.WEBSOCKET_UPDATES,
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER,
        'x-dead-letter-routing-key': QUEUES.DLQ_PROCESSING,
      },
    },
  })
  async handleFamilyAdminEvent(event: BaseEvent): Promise<void | Nack> {
    try {
      this.logger.debug(`Received family admin event: ${event.type}`);

      // Convert routing key to websocket event name (e.g., family.member.removed -> family_member_removed)
      const wsEventName = event.type.replace(/\./g, '_');

      this.eventEmitter.emit('ws.broadcast', {
        event: wsEventName,
        data: event.data,
        rooms: this.getRoomsForEvent(event),
      });
    } catch (error) {
      this.logger.error(`Error handling family admin event: ${error}`);
      return new Nack(true);
    }
  }

  /**
   * Listen to care recipient events (created, updated, deleted)
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.DOMAIN_EVENTS,
    routingKey: 'care_recipient.*',
    queue: QUEUES.WEBSOCKET_UPDATES,
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER,
        'x-dead-letter-routing-key': QUEUES.DLQ_PROCESSING,
      },
    },
  })
  async handleCareRecipientEvent(event: BaseEvent): Promise<void | Nack> {
    try {
      this.logger.debug(`Received care recipient event: ${event.type}`);

      // Convert routing key to websocket event name (e.g., care_recipient.deleted -> care_recipient_deleted)
      const wsEventName = event.type.replace(/\./g, '_');

      this.eventEmitter.emit('ws.broadcast', {
        event: wsEventName,
        data: event.data,
        rooms: this.getRoomsForEvent(event),
      });
    } catch (error) {
      this.logger.error(`Error handling care recipient event: ${error}`);
      return new Nack(true);
    }
  }

  /**
   * Listen to document events (uploaded, deleted)
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.DOMAIN_EVENTS,
    routingKey: 'document.*',
    queue: QUEUES.WEBSOCKET_UPDATES,
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER,
        'x-dead-letter-routing-key': QUEUES.DLQ_PROCESSING,
      },
    },
  })
  async handleDocumentEvent(event: BaseEvent): Promise<void | Nack> {
    try {
      this.logger.debug(`Received document event: ${event.type}`);

      // Convert routing key to websocket event name (e.g., document.uploaded -> document_uploaded)
      const wsEventName = event.type.replace(/\./g, '_');

      this.eventEmitter.emit('ws.broadcast', {
        event: wsEventName,
        data: event.data,
        rooms: this.getRoomsForEvent(event),
      });
    } catch (error) {
      this.logger.error(`Error handling document event: ${error}`);
      return new Nack(true);
    }
  }

  /**
   * Determine which WebSocket rooms should receive the event
   */
  private getRoomsForEvent(event: BaseEvent): string[] {
    const rooms: string[] = [];

    // Add family room if present
    if (event.familyId) {
      rooms.push(`family:${event.familyId}`);
    }

    // Add care recipient room if present
    if (event.careRecipientId) {
      rooms.push(`care-recipient:${event.careRecipientId}`);
    }

    return rooms;
  }
}

