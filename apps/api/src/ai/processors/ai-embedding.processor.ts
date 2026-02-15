import { Processor, Process, OnQueueFailed, OnQueueCompleted } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { GeminiService } from '../services/gemini.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * In-process BullMQ processor for AI embedding jobs.
 *
 * This replaces the standalone worker in apps/workers/ for single-server deployments.
 * Jobs are processed in the same Node.js process as the API — no separate worker needed.
 *
 * How it works:
 * 1. EmbeddingIndexerService enqueues a job to the "ai-embeddings" BullMQ queue
 * 2. This processor (running inside the NestJS API process) picks it up
 * 3. It calls Gemini to generate the embedding, then stores it in PostgreSQL (pgvector)
 *
 * The standalone workers in apps/workers/ are still available for scaled deployments
 * where you want to offload embedding to a separate machine.
 */
export interface AiEmbeddingJobData {
  content: string;
  resourceType: string;
  resourceId: string;
  familyId: string;
  careRecipientId?: string;
  metadata?: Record<string, any>;
  action: 'upsert' | 'delete';
}

@Processor('ai-embeddings')
export class AiEmbeddingProcessor {
  private readonly logger = new Logger(AiEmbeddingProcessor.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly prisma: PrismaService,
  ) {}

  @Process('embed')
  async handleEmbed(job: Job<AiEmbeddingJobData>): Promise<void> {
    const { content, resourceType, resourceId, familyId, careRecipientId, metadata } = job.data;

    if (!this.geminiService.enabled) {
      this.logger.debug('AI disabled — skipping embedding');
      return;
    }

    this.logger.debug(
      { resourceType, resourceId },
      'Generating embedding',
    );

    // Generate the 768-dim embedding vector via Gemini
    const embedding = await this.geminiService.generateEmbedding(content);
    const vectorStr = `[${embedding.join(',')}]`;

    // Upsert: delete existing, then insert new
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM "public"."ai_embeddings" WHERE resource_type = $1 AND resource_id = $2`,
      resourceType,
      resourceId,
    );

    await this.prisma.$queryRawUnsafe(
      `INSERT INTO "public"."ai_embeddings" (content, embedding, resource_type, resource_id, family_id, care_recipient_id, metadata)
       VALUES ($1, $2::vector, $3, $4, $5, $6, $7::jsonb)`,
      content,
      vectorStr,
      resourceType,
      resourceId,
      familyId,
      careRecipientId || null,
      JSON.stringify(metadata || {}),
    );

    this.logger.debug({ resourceType, resourceId }, 'Embedding stored');
  }

  @Process('delete-embedding')
  async handleDelete(job: Job<AiEmbeddingJobData>): Promise<void> {
    const { resourceType, resourceId } = job.data;

    this.logger.debug({ resourceType, resourceId }, 'Deleting embedding');

    await this.prisma.$executeRawUnsafe(
      `DELETE FROM "public"."ai_embeddings" WHERE resource_type = $1 AND resource_id = $2`,
      resourceType,
      resourceId,
    );
  }

  @OnQueueCompleted()
  onCompleted(job: Job<AiEmbeddingJobData>) {
    this.logger.debug({ jobId: job.id, name: job.name }, 'Embedding job completed');
  }

  @OnQueueFailed()
  onFailed(job: Job<AiEmbeddingJobData>, error: Error) {
    this.logger.warn(
      { jobId: job.id, name: job.name, error: error.message },
      'Embedding job failed',
    );
  }
}
