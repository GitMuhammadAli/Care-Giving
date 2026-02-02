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
 * 
 * FREE-TIER FRIENDLY: App can operate in degraded mode without Redis.
 * Caching will be disabled but app will still function.
 */
export const RedisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: (configService: ConfigService): Redis | null => {
    const redisConfig = configService.get('redis');
    const isProduction = configService.get('app.isProduction', false);

    if (!redisConfig || !redisConfig.host) {
      // Allow app to start without Redis (degraded mode)
      logger.warn('Redis configuration not found - app running in degraded mode (no caching)');
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
        enableOfflineQueue: false, // Don't queue - fail fast for degraded mode
        retryStrategy: (times: number) => {
          if (times > 3) {
            logger.warn(`Redis connection failed after ${times} attempts - running in degraded mode`);
            return null; // Stop retrying, let app continue without Redis
          }
          return Math.min(times * 1000, 5000);
        },
        reconnectOnError: (err) => {
          const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
          return targetErrors.some((e) => err.message.includes(e));
        },
        lazyConnect: true, // Only connect when needed
      });

      redis.on('connect', () => {
        logger.log('Redis connected successfully');
      });

      redis.on('ready', () => {
        logger.log('Redis is ready to accept commands');
      });

      redis.on('error', (err) => {
        // Log but don't crash - graceful degradation
        logger.warn(`Redis error (app continues in degraded mode): ${err.message}`);
      });

      redis.on('close', () => {
        logger.warn('Redis connection closed - app running in degraded mode');
      });

      redis.on('reconnecting', () => {
        logger.log('Redis reconnecting...');
      });

      // Try to connect immediately to verify config, but don't block startup
      redis.connect().catch((err) => {
        logger.warn(`Redis initial connection failed: ${err.message} - app continues without cache`);
      });

      return redis;
    } catch (error) {
      // Don't throw - allow app to start in degraded mode
      logger.warn(`Failed to create Redis connection: ${error.message} - app running without cache`);
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
