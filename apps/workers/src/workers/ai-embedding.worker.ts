/**
 * AI Embedding Worker
 *
 * Processes embedding jobs from the queue:
 * - Generates text embeddings via Gemini gemini-embedding-001
 * - Stores embeddings in PostgreSQL (pgvector)
 * - Handles upsert and delete operations
 */

import { Worker, Job } from 'bullmq';
import { prisma } from '@carecircle/database';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  getRedisConnection,
  QUEUE_NAMES,
  getDefaultWorkerOptions,
  logger,
} from '../config';
import { moveToDeadLetter, type AiEmbeddingJob } from '../queues';
import { createJobLogger } from '@carecircle/logger';

// ============================================================================
// GEMINI CLIENT (Lazy)
// ============================================================================

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI | null {
  if (genAI) return genAI;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  genAI = new GoogleGenerativeAI(apiKey);
  return genAI;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const ai = getGenAI();
  if (!ai) throw new Error('GEMINI_API_KEY not configured');

  const model = ai.getGenerativeModel({ model: 'gemini-embedding-001' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

// ============================================================================
// WORKER
// ============================================================================

async function processJob(job: Job<AiEmbeddingJob>): Promise<void> {
  const jobLogger = createJobLogger(logger, job.name, job.id || 'unknown');
  const data = job.data;

  if (data.action === 'delete') {
    jobLogger.info(
      { resourceType: data.resourceType, resourceId: data.resourceId },
      'Deleting embeddings',
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM ai_embeddings WHERE resource_type = $1 AND resource_id = $2`,
      data.resourceType,
      data.resourceId,
    );
    return;
  }

  // Upsert
  jobLogger.info(
    { resourceType: data.resourceType, resourceId: data.resourceId },
    'Generating embedding',
  );

  const embedding = await generateEmbedding(data.content);
  const vectorStr = `[${embedding.join(',')}]`;

  // Delete existing
  await prisma.$executeRawUnsafe(
    `DELETE FROM ai_embeddings WHERE resource_type = $1 AND resource_id = $2`,
    data.resourceType,
    data.resourceId,
  );

  // Insert new
  await prisma.$queryRawUnsafe(
    `INSERT INTO ai_embeddings (content, embedding, resource_type, resource_id, family_id, care_recipient_id, metadata)
     VALUES ($1, $2::vector, $3, $4, $5, $6, $7::jsonb)`,
    data.content,
    vectorStr,
    data.resourceType,
    data.resourceId,
    data.familyId,
    data.careRecipientId || null,
    JSON.stringify(data.metadata || {}),
  );

  jobLogger.info('Embedding stored');
}

// ============================================================================
// EXPORT
// ============================================================================

const workerOpts = getDefaultWorkerOptions();

export const aiEmbeddingWorker = new Worker<AiEmbeddingJob>(
  QUEUE_NAMES.AI_EMBEDDINGS,
  async (job) => {
    try {
      await processJob(job);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        { jobId: job.id, error: errorMessage },
        'AI embedding job failed',
      );

      if (job.attemptsMade >= (job.opts.attempts || 2)) {
        await moveToDeadLetter(
          QUEUE_NAMES.AI_EMBEDDINGS,
          job.id || 'unknown',
          job.name,
          job.data,
          errorMessage,
          job.attemptsMade,
        );
      }

      throw error;
    }
  },
  {
    connection: getRedisConnection(),
    ...workerOpts,
    concurrency: 3,
  },
);

aiEmbeddingWorker.on('completed', (job) => {
  logger.debug({ jobId: job.id }, 'AI embedding job completed');
});

aiEmbeddingWorker.on('failed', (job, err) => {
  logger.warn({ jobId: job?.id, error: err.message }, 'AI embedding job failed');
});
