import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

import { OutboxService } from './outbox.service';
import { OutboxEntity } from './outbox.entity';

/**
 * Outbox Processor
 * 
 * Runs periodically to:
 * 1. Pick up pending events from the outbox table
 * 2. Publish them to RabbitMQ
 * 3. Mark them as processed or failed
 * 
 * This ensures reliable event delivery even if RabbitMQ was temporarily unavailable.
 */
@Injectable()
export class OutboxProcessor implements OnModuleInit {
  private readonly logger = new Logger(OutboxProcessor.name);
  private isProcessing = false;

  constructor(
    private readonly outboxService: OutboxService,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  onModuleInit() {
    this.logger.log('Outbox processor initialized');
  }

  /**
   * Process pending events every 5 seconds
   */
  @Cron(CronExpression.EVERY_5_SECONDS)
  async processPendingEvents(): Promise<void> {
    // Prevent concurrent processing
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const pendingEvents = await this.outboxService.getPendingEvents(50);

      if (pendingEvents.length === 0) {
        return;
      }

      this.logger.debug(`Processing ${pendingEvents.length} outbox events`);

      // Mark as processing (lock them)
      const ids = pendingEvents.map((e) => e.id);
      await this.outboxService.markAsProcessing(ids);

      // Process each event
      for (const event of pendingEvents) {
        await this.processEvent(event);
      }
    } catch (error) {
      this.logger.error('Error processing outbox events', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single event
   */
  private async processEvent(event: OutboxEntity): Promise<void> {
    try {
      // Publish to RabbitMQ
      await this.amqpConnection.publish(
        event.exchange,
        event.routingKey,
        event.payload,
        {
          persistent: true,
          contentType: 'application/json',
          messageId: event.id,
          correlationId: event.correlationId,
          timestamp: Date.now(),
          headers: {
            'x-event-type': event.eventType,
            'x-aggregate-type': event.aggregateType,
            'x-aggregate-id': event.aggregateId,
            'x-retry-count': event.retryCount,
          },
        },
      );

      // Mark as processed
      await this.outboxService.markAsProcessed(event.id);

      this.logger.debug(
        `Published event ${event.eventType} for ${event.aggregateType}:${event.aggregateId}`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.logger.error(
        `Failed to publish event ${event.id}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      await this.outboxService.markAsFailed(event.id, errorMessage);
    }
  }

  /**
   * Cleanup old processed events daily at 3 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldEvents(): Promise<void> {
    this.logger.log('Starting outbox cleanup...');
    const deleted = await this.outboxService.cleanupProcessedEvents(7);
    this.logger.log(`Outbox cleanup completed: ${deleted} events removed`);
  }

  /**
   * Log outbox statistics every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async logStats(): Promise<void> {
    const stats = await this.outboxService.getStats();
    this.logger.log(
      `Outbox stats - Pending: ${stats.pending}, Processing: ${stats.processing}, Failed: ${stats.failed}`,
    );
  }
}

