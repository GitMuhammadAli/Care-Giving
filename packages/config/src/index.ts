/**
 * @carecircle/config - Centralized configuration with Zod validation
 * 
 * Features:
 * - Type-safe environment variable access
 * - Zod validation with helpful error messages
 * - Firebase service account validation
 * - Singleton pattern for efficiency
 * - Service-specific configs
 */

import { z } from 'zod';

// ============================================================================
// ENVIRONMENT SCHEMAS
// ============================================================================

/**
 * Web Push VAPID Keys Schema
 */
export const WebPushConfigSchema = z.object({
  publicKey: z.string().min(1, 'VAPID public key is required'),
  privateKey: z.string().min(1, 'VAPID private key is required'),
  subject: z.string().email('VAPID subject must be a mailto: email').or(z.string().startsWith('mailto:')),
});

export type WebPushConfig = z.infer<typeof WebPushConfigSchema>;

/**
 * Base Environment Schema
 */
export const BaseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

/**
 * Database Environment Schema
 */
export const DatabaseEnvSchema = z.object({
  DATABASE_URL: z.string().url('Invalid DATABASE_URL').min(1),
});

/**
 * Redis Environment Schema
 */
export const RedisEnvSchema = z.object({
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_TLS: z.coerce.boolean().default(false),
});

/**
 * Web Push Environment Schema
 */
export const WebPushEnvSchema = z.object({
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default('mailto:admin@carecircle.com'),
});

/**
 * Workers Environment Schema - Combined
 */
export const WorkersEnvSchema = BaseEnvSchema
  .merge(DatabaseEnvSchema)
  .merge(RedisEnvSchema)
  .merge(WebPushEnvSchema)
  .extend({
    // Worker-specific settings
    WORKER_CONCURRENCY: z.coerce.number().min(1).max(100).default(10),
    JOB_ATTEMPTS: z.coerce.number().min(1).max(10).default(5),
    JOB_BACKOFF_DELAY: z.coerce.number().min(100).max(60000).default(1000),
    JOB_TIMEOUT: z.coerce.number().min(1000).max(300000).default(30000),
  });

export type WorkersEnv = z.infer<typeof WorkersEnvSchema>;

// ============================================================================
// JOB PAYLOAD SCHEMAS
// ============================================================================

/**
 * Medication Reminder Job Schema
 */
export const MedicationReminderJobSchema = z.object({
  medicationId: z.string().uuid('Invalid medicationId'),
  careRecipientId: z.string().uuid('Invalid careRecipientId'),
  scheduledTime: z.string().datetime('Invalid scheduledTime format'),
  medicationName: z.string().min(1, 'medicationName is required'),
  dosage: z.string().min(1, 'dosage is required'),
  minutesBefore: z.number().min(0).max(1440),
});

export type MedicationReminderJob = z.infer<typeof MedicationReminderJobSchema>;

/**
 * Appointment Reminder Job Schema
 */
export const AppointmentReminderJobSchema = z.object({
  appointmentId: z.string().uuid('Invalid appointmentId'),
  careRecipientId: z.string().uuid('Invalid careRecipientId'),
  appointmentTime: z.string().datetime('Invalid appointmentTime format'),
  title: z.string().min(1, 'title is required'),
  location: z.string().optional(),
  minutesBefore: z.number().min(0).max(2880),
});

export type AppointmentReminderJob = z.infer<typeof AppointmentReminderJobSchema>;

/**
 * Shift Reminder Job Schema
 */
export const ShiftReminderJobSchema = z.object({
  shiftId: z.string().uuid('Invalid shiftId'),
  careRecipientId: z.string().uuid('Invalid careRecipientId'),
  caregiverId: z.string().uuid('Invalid caregiverId'),
  startTime: z.string().datetime('Invalid startTime format'),
  minutesBefore: z.number().min(0).max(1440),
});

export type ShiftReminderJob = z.infer<typeof ShiftReminderJobSchema>;

/**
 * Notification Job Schema
 */
export const NotificationJobSchema = z.object({
  type: z.enum(['PUSH', 'IN_APP', 'SMS', 'EMAIL']),
  userId: z.string().uuid('Invalid userId'),
  title: z.string().min(1, 'title is required').max(100),
  body: z.string().min(1, 'body is required').max(500),
  data: z.record(z.string()).optional(),
  priority: z.enum(['normal', 'high']).default('normal'),
});

export type NotificationJob = z.infer<typeof NotificationJobSchema>;

/**
 * Refill Alert Job Schema
 */
export const RefillAlertJobSchema = z.object({
  medicationId: z.string().uuid('Invalid medicationId'),
  medicationName: z.string().min(1),
  currentSupply: z.number().min(0),
  refillAt: z.number().min(0),
  careRecipientId: z.string().uuid('Invalid careRecipientId'),
  careRecipientName: z.string().min(1),
  familyMemberUserIds: z.array(z.string().uuid()),
});

export type RefillAlertJob = z.infer<typeof RefillAlertJobSchema>;

// ============================================================================
// CONFIG SINGLETON
// ============================================================================

let cachedConfig: WorkersEnv | null = null;

/**
 * Parse and validate environment variables for workers
 * Throws on validation failure with detailed error messages
 */
export function getWorkersConfig(): WorkersEnv {
  if (cachedConfig) {
    return cachedConfig;
  }

  const result = WorkersEnvSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map(
      (issue) => `  - ${issue.path.join('.')}: ${issue.message}`
    ).join('\n');
    
    throw new Error(
      `❌ Environment validation failed:\n${errors}\n\nPlease check your .env file.`
    );
  }

  cachedConfig = result.data;
  return cachedConfig;
}

/**
 * Check if Web Push is properly configured
 */
export function isWebPushConfigured(): boolean {
  const config = getWorkersConfig();
  return !!(config.VAPID_PUBLIC_KEY && config.VAPID_PRIVATE_KEY);
}

/**
 * Get Web Push configuration if available
 */
export function getWebPushConfig(): WebPushConfig | null {
  const config = getWorkersConfig();
  
  if (!config.VAPID_PUBLIC_KEY || !config.VAPID_PRIVATE_KEY) {
    return null;
  }

  return {
    publicKey: config.VAPID_PUBLIC_KEY,
    privateKey: config.VAPID_PRIVATE_KEY,
    subject: config.VAPID_SUBJECT,
  };
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate a job payload against its schema
 */
export function validateJobPayload<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  jobName: string
): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`
    ).join(', ');
    
    throw new Error(`Invalid ${jobName} payload: ${errors}`);
  }

  return result.data;
}

// ============================================================================
// BULLMQ DEFAULT OPTIONS
// ============================================================================

/**
 * Default job options for BullMQ queues
 */
export function getDefaultJobOptions(config?: WorkersEnv) {
  const cfg = config || getWorkersConfig();
  
  return {
    attempts: cfg.JOB_ATTEMPTS,
    backoff: {
      type: 'exponential' as const,
      delay: cfg.JOB_BACKOFF_DELAY,
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours
    },
    timeout: cfg.JOB_TIMEOUT,
  };
}

/**
 * Default worker options for BullMQ workers
 */
export function getDefaultWorkerOptions(config?: WorkersEnv) {
  const cfg = config || getWorkersConfig();
  
  return {
    concurrency: cfg.WORKER_CONCURRENCY,
    autorun: true,
  };
}

// ============================================================================
// REDIS CONNECTION OPTIONS
// ============================================================================

/**
 * Get Redis connection options with cloud-friendly settings
 * Includes retry strategy, keepalive, and proper timeouts
 */
export function getRedisConfig(config?: WorkersEnv) {
  const cfg = config || getWorkersConfig();

  // Common options for cloud Redis (Upstash, etc.)
  const commonOptions: Record<string, unknown> = {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false, // Faster startup
    connectTimeout: 20000, // 20 second connect timeout for cloud
    commandTimeout: 10000, // 10 second command timeout
    keepAlive: 30000, // Send keepalive every 30 seconds
    retryStrategy: (times: number) => {
      // Exponential backoff with max 30 second delay
      const delay = Math.min(times * 1000, 30000);
      return delay;
    },
    reconnectOnError: (err: Error) => {
      // Reconnect on connection reset
      const targetErrors = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED'];
      return targetErrors.some((e) => err.message.includes(e));
    },
  };

  // If REDIS_URL is provided, parse it
  if (cfg.REDIS_URL) {
    return {
      url: cfg.REDIS_URL,
      ...commonOptions,
    };
  }

  const options: Record<string, unknown> = {
    host: cfg.REDIS_HOST,
    port: cfg.REDIS_PORT,
    ...commonOptions,
  };

  if (cfg.REDIS_PASSWORD) {
    options.password = cfg.REDIS_PASSWORD;
  }

  if (cfg.REDIS_TLS) {
    options.tls = {};
  }

  return options;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { z } from 'zod';

