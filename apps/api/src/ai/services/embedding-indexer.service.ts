import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Enqueues embedding jobs for the AI worker.
 *
 * Usage: call the public methods from any service when data changes.
 * The actual embedding is done asynchronously by the ai-embedding worker.
 *
 * This service is a thin wrapper that only enqueues BullMQ jobs —
 * keeping the embedding logic in the worker to avoid blocking the API.
 */
@Injectable()
export class EmbeddingIndexerService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingIndexerService.name);
  private isEnabled = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @InjectQueue('ai-embeddings') private readonly embeddingQueue: Queue,
  ) {}

  onModuleInit() {
    this.isEnabled = !!this.configService.get<string>('ai.geminiApiKey');
    if (this.isEnabled) {
      this.logger.log('Embedding indexer enabled — will enqueue embedding jobs');
    }
  }

  /**
   * Index a timeline entry for RAG.
   */
  async indexTimelineEntry(entry: {
    id: string;
    title: string;
    description?: string | null;
    type: string;
    severity?: string | null;
    careRecipientId: string;
    createdAt?: Date;
  }) {
    if (!this.isEnabled) return;

    const careRecipient = await this.getCareRecipientFamily(entry.careRecipientId);
    if (!careRecipient) return;

    const content = [
      `Timeline entry: ${entry.title}`,
      entry.description ? `Details: ${entry.description}` : '',
      `Type: ${entry.type}`,
      entry.severity ? `Severity: ${entry.severity}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    await this.enqueueEmbedding({
      content,
      resourceType: 'timeline_entry',
      resourceId: entry.id,
      familyId: careRecipient.familyId,
      careRecipientId: entry.careRecipientId,
      metadata: { title: entry.title, type: entry.type },
    });
  }

  /**
   * Index a medication for RAG.
   */
  async indexMedication(medication: {
    id: string;
    name: string;
    dosage: string;
    frequency?: string | null;
    instructions?: string | null;
    careRecipientId: string;
  }) {
    if (!this.isEnabled) return;

    const careRecipient = await this.getCareRecipientFamily(medication.careRecipientId);
    if (!careRecipient) return;

    const content = [
      `Medication: ${medication.name}`,
      `Dosage: ${medication.dosage}`,
      medication.frequency ? `Frequency: ${medication.frequency}` : '',
      medication.instructions ? `Instructions: ${medication.instructions}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    await this.enqueueEmbedding({
      content,
      resourceType: 'medication',
      resourceId: medication.id,
      familyId: careRecipient.familyId,
      careRecipientId: medication.careRecipientId,
      metadata: { title: medication.name },
    });
  }

  /**
   * Index an appointment for RAG.
   */
  async indexAppointment(appointment: {
    id: string;
    title: string;
    type: string;
    notes?: string | null;
    location?: string | null;
    careRecipientId: string;
    startTime: Date;
  }) {
    if (!this.isEnabled) return;

    const careRecipient = await this.getCareRecipientFamily(appointment.careRecipientId);
    if (!careRecipient) return;

    const content = [
      `Appointment: ${appointment.title}`,
      `Type: ${appointment.type}`,
      `Date: ${appointment.startTime.toLocaleDateString()}`,
      appointment.location ? `Location: ${appointment.location}` : '',
      appointment.notes ? `Notes: ${appointment.notes}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    await this.enqueueEmbedding({
      content,
      resourceType: 'appointment',
      resourceId: appointment.id,
      familyId: careRecipient.familyId,
      careRecipientId: appointment.careRecipientId,
      metadata: { title: appointment.title, type: appointment.type },
    });
  }

  /**
   * Index a document for RAG (name, type, notes — not full content).
   */
  async indexDocument(document: {
    id: string;
    name: string;
    type?: string | null;
    notes?: string | null;
    familyId: string;
    careRecipientId?: string | null;
  }) {
    if (!this.isEnabled) return;

    const content = [
      `Document: ${document.name}`,
      document.type ? `Type: ${document.type}` : '',
      document.notes ? `Notes: ${document.notes}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    await this.enqueueEmbedding({
      content,
      resourceType: 'document',
      resourceId: document.id,
      familyId: document.familyId,
      careRecipientId: document.careRecipientId || undefined,
      metadata: { title: document.name },
    });
  }

  /**
   * Remove embeddings when a resource is deleted.
   */
  async removeEmbedding(resourceType: string, resourceId: string) {
    if (!this.isEnabled) return;

    await this.embeddingQueue.add('delete-embedding', {
      resourceType,
      resourceId,
      action: 'delete',
      content: '', // Not needed for delete
      familyId: '', // Not needed for delete
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // BACKFILL — re-index all existing records for a care recipient
  // ═══════════════════════════════════════════════════════════════

  /**
   * Re-index all existing records for a care recipient.
   * Call this to backfill embeddings for records that were created
   * before the AI system was deployed.
   */
  async backfillCareRecipient(careRecipientId: string): Promise<{
    timelineEntries: number;
    medications: number;
    appointments: number;
    total: number;
  }> {
    if (!this.isEnabled) {
      return { timelineEntries: 0, medications: 0, appointments: 0, total: 0 };
    }

    this.logger.log({ careRecipientId }, 'Starting embedding backfill');

    let timelineCount = 0;
    let medicationCount = 0;
    let appointmentCount = 0;

    // Backfill timeline entries
    const timelineEntries = await this.prisma.timelineEntry.findMany({
      where: { careRecipientId },
      select: { id: true, title: true, description: true, type: true, severity: true, careRecipientId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    for (const entry of timelineEntries) {
      await this.indexTimelineEntry(entry);
      timelineCount++;
    }

    // Backfill medications
    const medications = await this.prisma.medication.findMany({
      where: { careRecipientId, isActive: true },
      select: { id: true, name: true, dosage: true, frequency: true, instructions: true, careRecipientId: true },
    });

    for (const med of medications) {
      await this.indexMedication(med);
      medicationCount++;
    }

    // Backfill appointments
    const appointments = await this.prisma.appointment.findMany({
      where: { careRecipientId },
      select: { id: true, title: true, type: true, notes: true, location: true, careRecipientId: true, startTime: true },
      orderBy: { startTime: 'desc' },
      take: 100,
    });

    for (const apt of appointments) {
      await this.indexAppointment(apt);
      appointmentCount++;
    }

    const total = timelineCount + medicationCount + appointmentCount;
    this.logger.log(
      { careRecipientId, timelineCount, medicationCount, appointmentCount, total },
      'Embedding backfill complete — jobs enqueued',
    );

    return {
      timelineEntries: timelineCount,
      medications: medicationCount,
      appointments: appointmentCount,
      total,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  private async getCareRecipientFamily(careRecipientId: string) {
    return this.prisma.careRecipient.findUnique({
      where: { id: careRecipientId },
      select: { familyId: true },
    });
  }

  private async enqueueEmbedding(data: {
    content: string;
    resourceType: string;
    resourceId: string;
    familyId: string;
    careRecipientId?: string;
    metadata?: Record<string, any>;
  }) {
    try {
      await this.embeddingQueue.add('embed', {
        ...data,
        action: 'upsert',
      });
    } catch (error) {
      this.logger.warn(
        { error, resourceType: data.resourceType, resourceId: data.resourceId },
        'Failed to enqueue embedding job',
      );
    }
  }
}
