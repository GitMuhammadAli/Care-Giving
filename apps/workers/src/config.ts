/**
 * Worker Configuration
 * Uses @carecircle/config for validated env access
 */

import Redis from 'ioredis';
import { 
  getWorkersConfig, 
  getRedisConfig,
  getDefaultJobOptions,
  getDefaultWorkerOptions,
  getQueueEventsOptions,
  shouldDisableQueueEvents,
  isWebPushConfigured 
} from '@carecircle/config';
import { createLogger } from '@carecircle/logger';

// Load dotenv early
import 'dotenv/config';

// ============================================================================
// LOGGER
// ============================================================================

export const logger: ReturnType<typeof createLogger> = createLogger({ service: 'workers' });

// ============================================================================
// VALIDATED CONFIG
// ============================================================================

let _config: ReturnType<typeof getWorkersConfig> | null = null;

export function getConfig() {
  if (!_config) {
    _config = getWorkersConfig();
    logger.info({ 
      env: _config.NODE_ENV,
      logLevel: _config.LOG_LEVEL,
      webPushEnabled: isWebPushConfigured(),
    }, 'Workers config loaded');
  }
  return _config;
}

// ============================================================================
// REDIS CONNECTION
// ============================================================================

let _redisConnection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!_redisConnection) {
    const redisConfig = getRedisConfig(getConfig());
    
    logger.debug({ 
      host: redisConfig.host, 
      port: redisConfig.port,
      hasPassword: !!redisConfig.password,
      hasTls: !!redisConfig.tls,
    }, 'Creating Redis connection');

    if ('url' in redisConfig && redisConfig.url) {
      // Pass URL as first parameter, options as second
      const { url, ...options } = redisConfig;
      _redisConnection = new Redis(url as string, options);
    } else {
      _redisConnection = new Redis(redisConfig as any);
    }

    _redisConnection.on('connect', () => {
      logger.info('Redis connected');
    });

    _redisConnection.on('ready', () => {
      logger.info('Redis ready');
    });

    _redisConnection.on('reconnecting', (delay: number) => {
      logger.warn({ delay }, 'Redis reconnecting...');
    });

    _redisConnection.on('error', (err) => {
      // Only log if not a reconnection error (those are noisy)
      if (!err.message?.includes('ECONNRESET') && !err.message?.includes('ETIMEDOUT')) {
        logger.error({ err }, 'Redis connection error');
      }
    });
  }

  return _redisConnection;
}

// Legacy export for backwards compatibility
export const redisConnection = new Proxy({} as Redis, {
  get(_, prop) {
    return getRedisConnection()[prop as keyof Redis];
  }
});

// ============================================================================
// QUEUE NAMES
// ============================================================================

export const QUEUE_NAMES = {
  MEDICATION_REMINDERS: 'medication-reminders',
  APPOINTMENT_REMINDERS: 'appointment-reminders',
  SHIFT_REMINDERS: 'shift-reminders',
  NOTIFICATIONS: 'notifications',
  REFILL_ALERTS: 'refill-alerts',
  DEAD_LETTER: 'dead-letter-queue', // New: DLQ
  AI_SUMMARIES: 'ai-summaries',
  AI_EMBEDDINGS: 'ai-embeddings',
} as const;

// ============================================================================
// REMINDER WINDOWS
// ============================================================================

export const REMINDER_CONFIG = {
  // Reminder windows (minutes before event)
  medicationReminderMinutes: [30, 15, 5, 0],
  appointmentReminderMinutes: [1440, 60, 30], // 1 day, 1 hour, 30 min
  shiftReminderMinutes: [60, 15], // 1 hour, 15 min before shift
  
  // Check interval
  schedulerIntervalMs: 60 * 1000, // Check every minute
};

// Legacy export
export const config = {
  ...REMINDER_CONFIG,
  webPushEnabled: isWebPushConfigured(),
};

// ============================================================================
// BULLMQ OPTIONS EXPORTS
// ============================================================================

export { 
  getDefaultJobOptions, 
  getDefaultWorkerOptions,
  getQueueEventsOptions,
  shouldDisableQueueEvents,
};
