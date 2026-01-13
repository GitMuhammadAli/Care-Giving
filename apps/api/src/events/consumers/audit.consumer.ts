import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe, Nack } from '@golevelup/nestjs-rabbitmq';

import { EXCHANGES, QUEUES } from '../events.constants';
import { BaseEvent } from '../dto/events.dto';

/**
 * Audit Consumer
 * 
 * Listens to the audit fanout exchange and logs all events
 * for compliance and debugging purposes.
 * 
 * In production, this would persist to:
 * - Elasticsearch for searchable logs
 * - S3/CloudWatch for long-term storage
 * - DataDog/New Relic for observability
 */
@Injectable()
export class AuditConsumer {
  private readonly logger = new Logger(AuditConsumer.name);

  /**
   * Receive all events from the audit fanout exchange
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.AUDIT,
    routingKey: '', // Fanout ignores routing key
    queue: QUEUES.AUDIT_LOG,
    queueOptions: {
      durable: true,
    },
  })
  async handleAuditEvent(event: BaseEvent): Promise<void | Nack> {
    try {
      // Structure the audit log entry
      const auditEntry = {
        timestamp: event.timestamp,
        eventId: event.id,
        eventType: event.type,
        source: event.source,
        correlationId: event.correlationId,
        userId: event.causedBy,
        familyId: event.familyId,
        careRecipientId: event.careRecipientId,
        data: event.data,
      };

      // In production, persist to Elasticsearch or similar
      // For now, just log
      this.logger.log(
        `AUDIT: ${event.type} by ${event.causedBy || 'system'} - ${JSON.stringify(auditEntry)}`,
      );

      // TODO: Persist to audit database or external service
      // await this.elasticsearchService.index('audit-logs', auditEntry);
      
    } catch (error) {
      this.logger.error(`Failed to process audit event: ${error}`);
      // Audit failures should not requeue (fire-and-forget)
      return new Nack(false);
    }
  }

  /**
   * Analytics consumer - process events for analytics/reporting
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.AUDIT,
    routingKey: '',
    queue: QUEUES.ANALYTICS,
    queueOptions: {
      durable: true,
    },
  })
  async handleAnalyticsEvent(event: BaseEvent): Promise<void | Nack> {
    try {
      // Track metrics based on event type
      switch (event.type) {
        case 'medication.logged':
          // Track medication adherence
          this.logger.debug('Analytics: Medication logged event');
          break;
          
        case 'emergency.alert.created':
          // Track emergency frequency
          this.logger.debug('Analytics: Emergency alert event');
          break;
          
        case 'shift.started':
        case 'shift.ended':
          // Track caregiver activity
          this.logger.debug('Analytics: Shift event');
          break;
      }

      // TODO: Send to analytics service (Mixpanel, Amplitude, etc.)
      // await this.analyticsService.track(event.type, event.data);
      
    } catch (error) {
      this.logger.error(`Failed to process analytics event: ${error}`);
      return new Nack(false);
    }
  }
}

