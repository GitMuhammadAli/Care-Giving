/**
 * Example: How to Use the Event Publisher in Services
 * 
 * This file demonstrates the proper way to publish events
 * using the new RabbitMQ-based event system with the outbox pattern.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventPublisherService } from '../publishers/event-publisher.service';
import { ROUTING_KEYS } from '../events.constants';

// Example entity (replace with actual entity)
interface Medication {
  id: string;
  name: string;
  dosage: string;
  careRecipientId: string;
}

interface MedicationLog {
  id: string;
  medicationId: string;
  status: 'GIVEN' | 'SKIPPED' | 'MISSED';
  scheduledTime: Date;
  givenTime?: Date;
}

interface User {
  id: string;
  fullName: string;
}

interface CareRecipient {
  id: string;
  fullName: string;
  familyId: string;
}

@Injectable()
export class MedicationEventExample {
  constructor(
    private readonly dataSource: DataSource,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  /**
   * Example: Log medication with event publishing
   * 
   * This demonstrates the recommended pattern:
   * 1. Use a transaction for both database changes AND event creation
   * 2. The outbox processor will pick up and publish the event
   * 3. This ensures atomicity - event is only sent if DB commit succeeds
   */
  async logMedicationWithEvent(
    medicationId: string,
    dto: { status: 'GIVEN' | 'SKIPPED'; scheduledTime: string; notes?: string },
    user: User,
    medication: Medication,
    careRecipient: CareRecipient,
  ): Promise<MedicationLog> {
    // Use a transaction to ensure atomicity
    return this.dataSource.transaction(async (entityManager) => {
      // 1. Create the medication log (domain operation)
      const log: MedicationLog = {
        id: 'generated-uuid',
        medicationId,
        status: dto.status,
        scheduledTime: new Date(dto.scheduledTime),
        givenTime: dto.status === 'GIVEN' ? new Date() : undefined,
      };

      // Save the log using entity manager (within transaction)
      // await entityManager.save(MedicationLogEntity, log);

      // 2. Update medication supply count if needed
      // await entityManager.decrement(MedicationEntity, { id: medicationId }, 'currentSupply', 1);

      // 3. Publish event (stored in outbox within same transaction)
      await this.eventPublisher.publish(
        ROUTING_KEYS.MEDICATION_LOGGED,
        {
          medicationId: medication.id,
          medicationName: medication.name,
          status: dto.status,
          loggedById: user.id,
          loggedByName: user.fullName,
          careRecipientId: careRecipient.id,
          careRecipientName: careRecipient.fullName,
          scheduledTime: dto.scheduledTime,
          actualTime: new Date().toISOString(),
          notes: dto.notes,
        },
        {
          aggregateType: 'Medication',
          aggregateId: medicationId,
        },
        {
          useOutbox: true, // Store in outbox (recommended for domain events)
          causedBy: user.id,
          familyId: careRecipient.familyId,
          careRecipientId: careRecipient.id,
        },
      );

      return log;
    });
  }

  /**
   * Example: Send a medication reminder (non-critical, direct publish)
   * 
   * Reminders can use direct publish since they're not critical.
   * If RabbitMQ is down, the reminder is just skipped.
   */
  async sendMedicationReminder(
    medication: Medication,
    careRecipient: CareRecipient,
    scheduledTime: Date,
  ): Promise<void> {
    await this.eventPublisher.publishDirect(
      ROUTING_KEYS.MEDICATION_DUE,
      {
        medicationId: medication.id,
        medicationName: medication.name,
        dosage: medication.dosage,
        careRecipientId: careRecipient.id,
        careRecipientName: careRecipient.fullName,
        scheduledTime: scheduledTime.toISOString(),
      },
      {
        familyId: careRecipient.familyId,
        careRecipientId: careRecipient.id,
      },
    );
  }

  /**
   * Example: Publish an emergency alert (critical, always use outbox)
   * 
   * Emergency alerts MUST use the outbox pattern for reliability.
   * They cannot be lost under any circumstances.
   */
  async createEmergencyAlert(
    alertId: string,
    type: 'FALL' | 'MEDICAL' | 'HOSPITALIZATION' | 'MISSING' | 'OTHER',
    careRecipient: CareRecipient,
    user: User,
    familyMemberIds: string[],
    description?: string,
  ): Promise<void> {
    await this.eventPublisher.publishEmergencyAlert(
      alertId,
      {
        alertId,
        type,
        severity: 'CRITICAL',
        careRecipientId: careRecipient.id,
        careRecipientName: careRecipient.fullName,
        description,
        createdById: user.id,
        createdByName: user.fullName,
        familyMemberIds,
      },
      {
        causedBy: user.id,
        familyId: careRecipient.familyId,
        careRecipientId: careRecipient.id,
      },
    );
  }

  /**
   * Example: Send a push notification
   * 
   * Notifications use direct publish to the notifications exchange.
   */
  async notifyFamilyMember(
    userId: string,
    title: string,
    body: string,
    url?: string,
  ): Promise<void> {
    await this.eventPublisher.publishNotification(
      'push',
      {
        userId,
        title,
        body,
        url,
        priority: 'normal' as const,
      },
    );
  }

  /**
   * Example: Publish an audit event
   * 
   * Audit events are fire-and-forget to the audit fanout exchange.
   * All audit consumers receive every audit event.
   */
  async auditMedicationChange(
    medicationId: string,
    action: 'created' | 'updated' | 'deleted',
    user: User,
    changes: Record<string, unknown>,
  ): Promise<void> {
    await this.eventPublisher.publishAuditEvent(
      `medication.${action}`,
      {
        medicationId,
        action,
        changes,
        performedBy: {
          id: user.id,
          name: user.fullName,
        },
      },
      {
        causedBy: user.id,
      },
    );
  }
}

