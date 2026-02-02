/**
 * FREE-TIER RESOURCE LIMITS
 *
 * These limits protect against exceeding free-tier quotas on external services.
 * Values are set at 80% of provider limits to provide a safety buffer.
 */

export const RESOURCE_LIMITS = {
  // Brevo (formerly Sendinblue) - 300 emails/day free
  EMAILS_PER_DAY: {
    providerLimit: 300,
    appLimit: 240, // 80% of provider limit
    warningThreshold: 200, // 66%
  },

  // Cloudinary - 25K transformations/month, 25GB storage
  FILE_UPLOADS_PER_MONTH: {
    providerLimit: 25000,
    appLimit: 20000, // 80%
    warningThreshold: 15000,
  },

  // File size limit (per file)
  MAX_FILE_SIZE_BYTES: {
    limit: 10 * 1024 * 1024, // 10MB
  },

  // Upstash Redis - 10K commands/day free
  REDIS_COMMANDS_PER_DAY: {
    providerLimit: 10000,
    appLimit: 8000, // 80%
    warningThreshold: 6000,
  },

  // CloudAMQP (Little Lemur) - 1M messages/month
  RABBITMQ_MESSAGES_PER_MONTH: {
    providerLimit: 1000000,
    appLimit: 800000, // 80%
    warningThreshold: 600000,
  },

  // Neon PostgreSQL - 3GB storage, 0.25 vCPU
  // (Tracked at infrastructure level, not in code)

  // General API rate limits (already handled by throttler)
  API_REQUESTS_PER_MINUTE: {
    limit: 100,
    burstLimit: 150,
  },
} as const;

/**
 * Resource types matching the Prisma enum
 */
export enum ResourceType {
  EMAILS_SENT = 'EMAILS_SENT',
  FILE_UPLOADS = 'FILE_UPLOADS',
  FILE_SIZE_BYTES = 'FILE_SIZE_BYTES',
  REDIS_COMMANDS = 'REDIS_COMMANDS',
  RABBITMQ_MESSAGES = 'RABBITMQ_MESSAGES',
  API_REQUESTS = 'API_REQUESTS',
}

/**
 * Period types matching the Prisma enum
 */
export enum PeriodType {
  DAILY = 'DAILY',
  MONTHLY = 'MONTHLY',
}

/**
 * Get the start of the current period
 */
export function getPeriodStart(periodType: PeriodType): Date {
  const now = new Date();

  if (periodType === PeriodType.DAILY) {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  // Monthly
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

