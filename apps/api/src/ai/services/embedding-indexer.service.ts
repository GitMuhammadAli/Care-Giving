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
