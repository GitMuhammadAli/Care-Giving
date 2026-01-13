import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { OutboxEntity } from './outbox.entity';
import { BaseEvent } from '../dto/events.dto';
import { EXCHANGES, RoutingKey } from '../events.constants';

export interface CreateOutboxEventOptions {
  eventType: RoutingKey;
  exchange?: string;
  routingKey?: RoutingKey;
  payload: Record<string, unknown>;
  aggregateType: string;
  aggregateId: string;
  correlationId?: string;
  causedBy?: string;
  familyId?: string;
  careRecipientId?: string;
}

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    @InjectRepository(OutboxEntity)
    private readonly outboxRepository: Repository<OutboxEntity>,
  ) {}

  /**
   * Create an event in the outbox (within the same transaction as domain changes)
   * This ensures the event is only stored if the domain operation succeeds.
   */
  async createEvent(options: CreateOutboxEventOptions): Promise<OutboxEntity> {
    const event: BaseEvent = {
      id: uuidv4(),
      type: options.eventType,
      source: 'carecircle-api',
      timestamp: new Date().toISOString(),
      specVersion: '1.0',
      data: options.payload,
      correlationId: options.correlationId || uuidv4(),
      causedBy: options.causedBy,
      familyId: options.familyId,
      careRecipientId: options.careRecipientId,
    };

    const outboxEntry = this.outboxRepository.create({
      eventType: options.eventType,
      exchange: options.exchange || EXCHANGES.DOMAIN_EVENTS,
      routingKey: options.routingKey || options.eventType,
      payload: event as unknown as Record<string, unknown>,
      aggregateType: options.aggregateType,
      aggregateId: options.aggregateId,
      status: 'PENDING',
      correlationId: options.correlationId,
      causedBy: options.causedBy,
    });

    const saved = await this.outboxRepository.save(outboxEntry);
    this.logger.debug(`Created outbox event: ${options.eventType} for ${options.aggregateType}:${options.aggregateId}`);
    
    return saved;
  }

  /**
   * Get pending events for processing
   */
  async getPendingEvents(limit: number = 100): Promise<OutboxEntity[]> {
    return this.outboxRepository.find({
      where: [
        { status: 'PENDING' },
        // Retry failed events (max 5 retries)
        { status: 'FAILED', retryCount: LessThan(5) },
      ],
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }

  /**
   * Mark events as processing (lock them)
   */
  async markAsProcessing(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    await this.outboxRepository.update(
      { id: In(ids) },
      { status: 'PROCESSING' },
    );
  }

  /**
   * Mark event as successfully processed
   */
  async markAsProcessed(id: string): Promise<void> {
    await this.outboxRepository.update(id, {
      status: 'PROCESSED',
      processedAt: new Date(),
    });
  }

  /**
   * Mark event as failed
   */
  async markAsFailed(id: string, error: string): Promise<void> {
    await this.outboxRepository.increment({ id }, 'retryCount', 1);
    await this.outboxRepository.update(id, {
      status: 'FAILED',
      lastError: error,
    });
  }

  /**
   * Cleanup old processed events (retention policy)
   */
  async cleanupProcessedEvents(olderThanDays: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.outboxRepository.delete({
      status: 'PROCESSED',
      processedAt: LessThan(cutoffDate),
    });

    if (result.affected && result.affected > 0) {
      this.logger.log(`Cleaned up ${result.affected} processed outbox events`);
    }

    return result.affected || 0;
  }

  /**
   * Get statistics about the outbox
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    processed: number;
    failed: number;
  }> {
    const [pending, processing, processed, failed] = await Promise.all([
      this.outboxRepository.count({ where: { status: 'PENDING' } }),
      this.outboxRepository.count({ where: { status: 'PROCESSING' } }),
      this.outboxRepository.count({ where: { status: 'PROCESSED' } }),
      this.outboxRepository.count({ where: { status: 'FAILED' } }),
    ]);

    return { pending, processing, processed, failed };
  }
}

