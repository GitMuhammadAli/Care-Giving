import { Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

const logger = new Logger('RedisProvider');

/**
 * Shared Redis connection provider
 *
 * This creates a single Redis connection that can be injected
 * into any service that needs it (CacheService, OtpHelper, LockHelper, etc.)
 */
export const RedisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: (configService: ConfigService): Redis | null => {
    const redisConfig = configService.get('redis');
    const isProduction = configService.get('app.isProduction', false);

    if (!redisConfig) {
      if (isProduction) {
        throw new Error('Redis configuration is required in production');
      }
      logger.warn('Redis configuration not found - caching disabled in development');
      return null;
    }

    const { host, port, password, tls } = redisConfig;

    try {
      const redis = new Redis({
        host: host || 'localhost',
        port: port || 6379,
        password: password || undefined,
        tls: tls ? {} : undefined,
        // FREE-TIER OPTIMIZATION: Reduce Redis commands to stay within Upstash 10K/day limit
        maxRetriesPerRequest: 2, // Reduced from 3
        connectTimeout: 20000, // 20 second timeout for cloud Redis
        keepAlive: 60000, // Keepalive every 60s (reduced from default)
        enableOfflineQueue: true, // Queue commands when disconnected
        retryStrategy: (times: number) => {
          if (times > 5) { // Reduced from 10
            logger.error('Redis max retries exceeded');
            if (isProduction) {
              // In production, keep trying but slower
              return 10000; // 10 seconds between retries
            }
            return null; // Stop retrying in dev
          }
          return Math.min(times * 500, 5000); // Slower retry backoff
        },
        reconnectOnError: (err) => {
          const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
          return targetErrors.some((e) => err.message.includes(e));
        },
        lazyConnect: true, // FREE-TIER: Only connect when needed
      });

      redis.on('connect', () => {
        logger.log('Redis connected successfully');
      });

      redis.on('ready', () => {
        logger.log('Redis is ready to accept commands');
      });

      redis.on('error', (err) => {
        if (isProduction) {
          logger.error(`Redis connection error: ${err.message}`);
        } else {
          logger.warn(`Redis connection error (dev mode): ${err.message}`);
        }
      });

      redis.on('close', () => {
        logger.warn('Redis connection closed');
      });

      redis.on('reconnecting', () => {
        logger.log('Redis reconnecting...');
      });

      return redis;
    } catch (error) {
      if (isProduction) {
        throw new Error(`Failed to create Redis connection: ${error.message}`);
      }
      logger.warn(`Failed to create Redis connection (dev mode): ${error.message}`);
      return null;
    }
  },
  inject: [ConfigService],
};

/**
 * Check if Redis client is connected and ready
 */
export function isRedisReady(redis: Redis | null): boolean {
  return redis !== null && redis.status === 'ready';
}
