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
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          if (times > 10) {
            logger.error('Redis max retries exceeded');
            if (isProduction) {
              // In production, keep trying
              return 5000;
            }
            return null; // Stop retrying in dev
          }
          return Math.min(times * 200, 2000);
        },
        reconnectOnError: (err) => {
          const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
          return targetErrors.some((e) => err.message.includes(e));
        },
        lazyConnect: false, // Connect immediately
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
