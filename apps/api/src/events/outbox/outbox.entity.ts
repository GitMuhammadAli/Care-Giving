import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Outbox Pattern Entity
 * 
 * The Outbox Pattern ensures reliable event publishing by:
 * 1. Storing events in the database within the same transaction as domain changes
 * 2. A background processor picks up pending events and publishes them to RabbitMQ
 * 3. Only marks events as processed after successful publish
 * 
 * This guarantees at-least-once delivery even if RabbitMQ is temporarily unavailable.
 */
@Entity('event_outbox')
@Index(['status', 'createdAt'])
@Index(['aggregateType', 'aggregateId'])
export class OutboxEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Event type (e.g., 'medication.logged', 'emergency.alert.created')
   */
  @Column({ name: 'event_type' })
  @Index()
  eventType: string;

  /**
   * Target exchange for the event
   */
  @Column({ name: 'exchange' })
  exchange: string;

  /**
   * Routing key for the event
   */
  @Column({ name: 'routing_key' })
  routingKey: string;

  /**
   * Serialized event payload (JSON)
   */
  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  /**
   * Domain aggregate type (e.g., 'Medication', 'Appointment')
   */
  @Column({ name: 'aggregate_type' })
  aggregateType: string;

  /**
   * Domain aggregate ID
   */
  @Column({ name: 'aggregate_id' })
  aggregateId: string;

  /**
   * Processing status
   */
  @Column({
    type: 'enum',
    enum: ['PENDING', 'PROCESSING', 'PROCESSED', 'FAILED'],
    default: 'PENDING',
  })
  @Index()
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';

  /**
   * Number of processing attempts
   */
  @Column({ name: 'retry_count', default: 0 })
  retryCount: number;

  /**
   * Last error message if failed
   */
  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError?: string;

  /**
   * When the event was processed
   */
  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt?: Date;

  /**
   * Correlation ID for distributed tracing
   */
  @Column({ name: 'correlation_id', nullable: true })
  correlationId?: string;

  /**
   * User who caused this event
   */
  @Column({ name: 'caused_by', nullable: true })
  causedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

