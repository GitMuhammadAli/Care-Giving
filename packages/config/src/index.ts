/**
 * @carecircle/config - Centralized configuration with Zod validation
 * 
 * Features:
 * - Type-safe environment variable access
 * - Zod validation with helpful error messages
 * - Firebase service account validation
 * - Singleton pattern for efficiency
 * - Service-specific configs
 * - Optimized BullMQ settings for cloud Redis (Upstash)
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
    
    // =========================================================================
    // REDIS OPTIMIZATION SETTINGS (critical for Upstash free tier!)
    // =========================================================================
    
    // Delay when queue is empty before checking again (ms)
    // Default: 5ms (WAY too fast!) -> 5000ms (5 seconds) for dev, 1000ms for prod
    WORKER_DRAIN_DELAY: z.coerce.number().min(100).max(60000).optional(),
    
    // How often to check for stalled jobs (ms)
    // Default: 30000ms -> 60000ms (1 minute) for dev, 30000ms for prod
    WORKER_STALLED_INTERVAL: z.coerce.number().min(5000).max(300000).optional(),
    
    // How long to lock a job before it's considered stalled (ms)
    WORKER_LOCK_DURATION: z.coerce.number().min(5000).max(300000).default(30000),
    
    // Disable QueueEvents in development (saves a LOT of Redis calls)
    WORKER_DISABLE_EVENTS: z.coerce.boolean().optional(),
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
// BULLMQ DEFAULT OPTIONS - OPTIMIZED FOR UPSTASH FREE TIER
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
 * 
 * OPTIMIZED: Dramatically reduced polling to save Redis requests!
 * 
 * Default BullMQ settings poll every 5ms when idle = ~12 requests/sec per worker
 * With 6 workers = ~72 requests/sec = ~260,000 requests/hour!
 * 
 * Optimized settings:
 * - Development: Poll every 5 seconds = ~0.2 requests/sec per worker
 * - Production: Poll every 1 second = ~1 request/sec per worker
 */
export function getDefaultWorkerOptions(config?: WorkersEnv) {
  const cfg = config || getWorkersConfig();
  const isDev = cfg.NODE_ENV === 'development';
  
  // Use environment variables if set, otherwise use smart defaults
  const drainDelay = cfg.WORKER_DRAIN_DELAY ?? (isDev ? 5000 : 1000);
  const stalledInterval = cfg.WORKER_STALLED_INTERVAL ?? (isDev ? 120000 : 30000);
  
  return {
    concurrency: cfg.WORKER_CONCURRENCY,
    autorun: true,
    
    // =========================================================================
    // CRITICAL: These settings control Redis polling frequency!
    // =========================================================================
    
    // How long to wait before checking for new jobs when queue is empty
    // Default is 5ms (!!) which burns through Upstash quota instantly
    drainDelay,
    
    // How often to check for stalled jobs (ms)
    // Default is 30s, we increase to 2min in dev to save requests
    stalledInterval,
    
    // How long a job can be locked before considered stalled
    lockDuration: cfg.WORKER_LOCK_DURATION,
    
    // Reduce lock renewal frequency
    lockRenewTime: Math.floor(cfg.WORKER_LOCK_DURATION / 2),
  };
}

/**
 * Get QueueEvents options - optimized for Upstash
 * 
 * QueueEvents use Redis pub/sub which adds extra requests.
 * In development, we can increase the blocking timeout significantly.
 */
export function getQueueEventsOptions(config?: WorkersEnv) {
  const cfg = config || getWorkersConfig();
  const isDev = cfg.NODE_ENV === 'development';
  
  return {
    // How long to block waiting for events before re-subscribing
    // Higher = fewer Redis calls, but slower event detection
    blockingTimeout: isDev ? 30000 : 10000, // 30s dev, 10s prod
  };
}

/**
 * Check if QueueEvents should be disabled (development optimization)
 */
export function shouldDisableQueueEvents(config?: WorkersEnv): boolean {
  const cfg = config || getWorkersConfig();
  
  // If explicitly set, use that
  if (cfg.WORKER_DISABLE_EVENTS !== undefined) {
    return cfg.WORKER_DISABLE_EVENTS;
  }
  
  // Default: disable in development to save Redis requests
  // QueueEvents are mainly for logging, not critical functionality
  return cfg.NODE_ENV === 'development';
}

// ============================================================================
// REDIS CONNECTION OPTIONS
// ============================================================================

/**
 * Get Redis connection options
 * Supports both local (Docker) and cloud (Upstash) Redis
 */
export function getRedisConfig(config?: WorkersEnv) {
  const cfg = config || getWorkersConfig();
  const isLocal = !cfg.REDIS_TLS && !cfg.REDIS_PASSWORD;

  // Base options - required for BullMQ
  const baseOptions: Record<string, unknown> = {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false, // Faster startup
    retryStrategy: (times: number) => {
      // Exponential backoff with max 10 second delay
      const delay = Math.min(times * 500, 10000);
      return delay;
    },
  };

  // Local Redis (Docker) - simpler, faster settings
  if (isLocal) {
    return {
      host: cfg.REDIS_HOST,
      port: cfg.REDIS_PORT,
      ...baseOptions,
      connectTimeout: 5000, // 5 seconds for local
      // No command timeout for local - let it complete
    };
  }

  // Cloud Redis (Upstash, etc.) - more robust settings
  const cloudOptions: Record<string, unknown> = {
    ...baseOptions,
    connectTimeout: 20000, // 20 seconds for cloud
    commandTimeout: 15000, // 15 seconds for cloud
    keepAlive: 30000, // Send keepalive every 30 seconds
    lazyConnect: true, // Don't connect until first command
    reconnectOnError: (err: Error) => {
      const targetErrors = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED'];
      return targetErrors.some((e) => err.message.includes(e));
    },
  };

  // If REDIS_URL is provided (cloud), use it
  if (cfg.REDIS_URL) {
    return {
      url: cfg.REDIS_URL,
      ...cloudOptions,
    };
  }

  // Otherwise build from host/port
  const options: Record<string, unknown> = {
    host: cfg.REDIS_HOST,
    port: cfg.REDIS_PORT,
    ...cloudOptions,
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
