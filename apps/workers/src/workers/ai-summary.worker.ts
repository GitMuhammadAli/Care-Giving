/**
 * AI Summary Worker
 *
 * Generates daily/weekly care summaries asynchronously via Gemini.
 * Can be triggered via the queue (e.g., scheduled daily at 7 AM).
 */

import { Worker, Job } from 'bullmq';
import { prisma } from '@carecircle/database';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { startOfDay, endOfDay, format } from 'date-fns';
import {
  getRedisConnection,
  QUEUE_NAMES,
  getDefaultWorkerOptions,
  logger,
} from '../config';
import { moveToDeadLetter, type AiSummaryJob } from '../queues';
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

// ============================================================================
// WORKER
// ============================================================================

async function processJob(job: Job<AiSummaryJob>): Promise<void> {
  const jobLogger = createJobLogger(logger, job.name, job.id || 'unknown');
  const { careRecipientId, type } = job.data;

  const ai = getGenAI();
  if (!ai) {
    jobLogger.warn('GEMINI_API_KEY not configured — skipping summary');
    return;
  }

  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  // Fetch care recipient and today's data
  const [careRecipient, timelineEntries, medicationLogs] = await Promise.all([
    prisma.careRecipient.findUnique({
      where: { id: careRecipientId },
      select: { fullName: true, preferredName: true },
    }),
    prisma.timelineEntry.findMany({
      where: { careRecipientId, occurredAt: { gte: dayStart, lte: dayEnd } },
      orderBy: { occurredAt: 'asc' },
      take: 30,
    }),
    prisma.medicationLog.findMany({
      where: {
        medication: { careRecipientId },
        scheduledTime: { gte: dayStart, lte: dayEnd },
      },
      include: { medication: { select: { name: true } } },
    }),
  ]);

  const name = careRecipient?.preferredName || careRecipient?.fullName || 'Care recipient';
  const dateStr = format(now, 'MMMM d, yyyy');

  const medGiven = medicationLogs.filter((l) => l.status === 'GIVEN').length;
  const medTotal = medicationLogs.length;

  const prompt = `Generate a ${type} care summary for ${name} on ${dateStr}.

Data:
- ${timelineEntries.length} timeline entries
- Medications: ${medGiven}/${medTotal} given

Respond in JSON with keys: summary (string), highlights (string[]), concerns (string[])`;

  const model = ai.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          summary: { type: SchemaType.STRING },
          highlights: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          concerns: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        },
      },
    },
    systemInstruction:
      'You are CareCircle AI, a compassionate care summary assistant for family caregivers. Be concise.',
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  jobLogger.info({ careRecipientId, type, resultLength: text.length }, 'Summary generated');
}

// ============================================================================
// EXPORT
// ============================================================================

const workerOpts = getDefaultWorkerOptions();

export const aiSummaryWorker = new Worker<AiSummaryJob>(
  QUEUE_NAMES.AI_SUMMARIES,
  async (job) => {
    try {
      await processJob(job);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        { jobId: job.id, error: errorMessage },
        'AI summary job failed',
      );

      if (job.attemptsMade >= (job.opts.attempts || 2)) {
        await moveToDeadLetter(
          QUEUE_NAMES.AI_SUMMARIES,
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
    concurrency: 1, // Summaries are less frequent, no need for parallelism
  },
);

aiSummaryWorker.on('completed', (job) => {
  logger.debug({ jobId: job.id }, 'AI summary job completed');
});

aiSummaryWorker.on('failed', (job, err) => {
  logger.warn({ jobId: job?.id, error: err.message }, 'AI summary job failed');
});
