/**
 * Dead Letter Queue Worker
 * 
 * Processes permanently failed jobs for:
 * - Alerting/monitoring
 * - Manual retry capabilities
 * - Audit logging
 * 
 * This worker doesn't actually process the jobs - it just logs them
 * and can send alerts to administrators.
 */

import { Worker, Job } from 'bullmq';
import { 
  getRedisConnection, 
  QUEUE_NAMES, 
  getDefaultWorkerOptions,
  logger 
} from '../config';
import { createJobLogger } from '@carecircle/logger';
import type { DeadLetterJob } from '../queues';

// ============================================================================
// ALERTING (Optional - configure as needed)
// ============================================================================

async function sendDLQAlert(job: DeadLetterJob): Promise<void> {
  // Integrated alerting system:
  // - Slack: Set SLACK_DLQ_WEBHOOK environment variable
  // - Add more integrations below (PagerDuty, email, etc.)

  logger.error({
    alert: 'DEAD_LETTER_QUEUE',
    originalQueue: job.originalQueue,
    originalJobId: job.originalJobId,
    originalJobName: job.originalJobName,
    error: job.error,
    failedAt: job.failedAt,
    attemptsMade: job.attemptsMade,
  }, '🚨 Job moved to Dead Letter Queue - manual intervention required');

  // Example: Send to Slack webhook
  const slackWebhook = process.env.SLACK_DLQ_WEBHOOK;
  if (slackWebhook) {
    try {
      await fetch(slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 Dead Letter Queue Alert`,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '🚨 Job Failed Permanently',
              },
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Queue:*\n${job.originalQueue}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Job Name:*\n${job.originalJobName}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Job ID:*\n${job.originalJobId}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Attempts:*\n${job.attemptsMade}`,
                },
              ],
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Error:*\n\`\`\`${job.error}\`\`\``,
              },
            },
          ],
        }),
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to send Slack DLQ alert');
    }
  }
}

// ============================================================================
// WORKER PROCESSOR
// ============================================================================

async function processDeadLetter(job: Job<DeadLetterJob>) {
  const jobLogger = createJobLogger(logger, job.id || 'unknown', 'dead-letter');
  
  const dlqJob = job.data;

  jobLogger.warn({
    originalQueue: dlqJob.originalQueue,
    originalJobId: dlqJob.originalJobId,
    originalJobName: dlqJob.originalJobName,
    error: dlqJob.error,
    attemptsMade: dlqJob.attemptsMade,
    failedAt: dlqJob.failedAt,
  }, 'Processing dead letter job');

  // Send alert to administrators
  await sendDLQAlert(dlqJob);

  // Store in database for audit trail (optional)
  // await prisma.deadLetterLog.create({ data: dlqJob });

  return { 
    processed: true, 
    alertSent: true,
    originalQueue: dlqJob.originalQueue,
    originalJobId: dlqJob.originalJobId,
  };
}

// ============================================================================
// WORKER INSTANCE
// ============================================================================

const workerOptions = getDefaultWorkerOptions();

export const deadLetterWorker = new Worker<DeadLetterJob>(
  QUEUE_NAMES.DEAD_LETTER,
  processDeadLetter,
  {
    connection: getRedisConnection(),
    ...workerOptions,
    concurrency: 1, // Process DLQ jobs one at a time
  }
);

// ============================================================================
// WORKER EVENTS
// ============================================================================

deadLetterWorker.on('completed', (job, result) => {
  const jobLogger = createJobLogger(logger, job.id || 'unknown', 'dead-letter');
  jobLogger.info({ result }, 'DLQ job processed');
});

deadLetterWorker.on('failed', (job, err) => {
  // This shouldn't happen - DLQ processing should never fail
  const jobLogger = createJobLogger(logger, job?.id || 'unknown', 'dead-letter');
  jobLogger.error({ err }, 'DLQ job failed (this should not happen!)');
});

deadLetterWorker.on('error', (err) => {
  logger.error({ err }, 'DLQ worker error');
});

