import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT, isRedisReady } from './redis.provider';

/**
 * CacheService - Centralized Redis caching service
 *
 * Features:
 * - Cache-aside pattern with getOrSet()
 * - Automatic JSON serialization/deserialization
 * - TTL support for all cached items
 * - Pattern-based cache invalidation
 * - Graceful degradation in development (no Redis = no cache)
 * - Strict mode in production (Redis required)
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly isProduction: boolean;
  private readonly enabled: boolean;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
    private readonly configService: ConfigService,
  ) {
    this.isProduction = configService.get('app.isProduction', false);
    this.enabled = isRedisReady(this.redis);

    if (!this.enabled) {
      if (this.isProduction) {
        this.logger.error('Redis is required in production but not available');
      } else {
        this.logger.warn('CacheService running in bypass mode (Redis unavailable)');
      }
    } else {
      this.logger.log('CacheService initialized with Redis');
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log('Redis connection closed');
    }
  }

  /**
   * Check if caching is enabled
   */
  isEnabled(): boolean {
    return this.enabled && isRedisReady(this.redis);
  }

  /**
   * Get a cached value
   * @returns The cached value or null if not found/expired
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      const data = await this.redis!.get(key);
      if (!data) {
        return null;
      }
      return JSON.parse(data) as T;
    } catch (error) {
      this.handleError('get', key, error);
      return null;
    }
  }

  /**
   * Set a cached value with TTL
   * @param key Cache key
   * @param value Value to cache (will be JSON stringified)
   * @param ttlSeconds TTL in seconds (default: 300 = 5 minutes)
   */
  async set(key: string, value: unknown, ttlSeconds: number = 300): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    try {
      const serialized = JSON.stringify(value);
      await this.redis!.setex(key, ttlSeconds, serialized);
    } catch (error) {
      this.handleError('set', key, error);
    }
  }

  /**
   * Delete one or more cache keys
   * @param keys Single key or array of keys to delete
   */
  async del(keys: string | string[]): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    try {
      const keysArray = Array.isArray(keys) ? keys : [keys];
      if (keysArray.length === 0) {
        return;
      }
      await this.redis!.del(...keysArray);
      this.logger.debug(`Cache invalidated: ${keysArray.join(', ')}`);
    } catch (error) {
      this.handleError('del', Array.isArray(keys) ? keys.join(', ') : keys, error);
    }
  }

  /**
   * Delete all keys matching a pattern
   * Warning: This uses SCAN which may be slow on large datasets
   * @param pattern Redis pattern (e.g., "user:*:123")
   */
  async delPattern(pattern: string): Promise<number> {
    if (!this.isEnabled()) {
      return 0;
    }

    try {
      let deletedCount = 0;
      let cursor = '0';

      do {
        const [newCursor, keys] = await this.redis!.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = newCursor;

        if (keys.length > 0) {
          await this.redis!.del(...keys);
          deletedCount += keys.length;
        }
      } while (cursor !== '0');

      if (deletedCount > 0) {
        this.logger.debug(`Cache pattern invalidated: ${pattern} (${deletedCount} keys)`);
      }
      return deletedCount;
    } catch (error) {
      this.handleError('delPattern', pattern, error);
      return 0;
    }
  }

  /**
   * Get or set pattern - the main caching method
   *
   * Checks cache first. If miss, calls factory function,
   * caches the result, and returns it.
   *
   * @param key Cache key
   * @param factory Function to call on cache miss
   * @param ttlSeconds TTL in seconds
   * @returns Cached or freshly fetched value
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds: number = 300,
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      this.logger.debug(`Cache hit: ${key}`);
      return cached;
    }

    // Cache miss - call factory
    this.logger.debug(`Cache miss: ${key}`);
    const value = await factory();

    // Cache the result (don't await - fire and forget)
    if (value !== null && value !== undefined) {
      this.set(key, value, ttlSeconds).catch((err) => {
        this.logger.warn(`Failed to cache ${key}: ${err.message}`);
      });
    }

    return value;
  }

  /**
   * Invalidate multiple cache keys at once
   * Useful for cascade invalidation
   */
  async invalidate(keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }
    await this.del(keys);
  }

  /**
   * Invalidate all cache keys for a specific entity
   * @param entityType Entity type (user, family, recipient)
   * @param entityId Entity ID
   */
  async invalidateEntity(
    entityType: 'user' | 'family' | 'recipient',
    entityId: string,
  ): Promise<void> {
    const patterns: Record<string, string> = {
      user: `user:*${entityId}*`,
      family: `family:*${entityId}*`,
      recipient: `recipient:*${entityId}*`,
    };

    const pattern = patterns[entityType];
    if (pattern) {
      await this.delPattern(pattern);
    }
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }

    try {
      const result = await this.redis!.exists(key);
      return result === 1;
    } catch (error) {
      this.handleError('exists', key, error);
      return false;
    }
  }

  /**
   * Get TTL of a cached key
   * @returns TTL in seconds, -1 if no TTL, -2 if key doesn't exist
   */
  async ttl(key: string): Promise<number> {
    if (!this.isEnabled()) {
      return -2;
    }

    try {
      return await this.redis!.ttl(key);
    } catch (error) {
      this.handleError('ttl', key, error);
      return -2;
    }
  }

  /**
   * Handle errors based on environment
   */
  private handleError(operation: string, key: string, error: Error): void {
    const message = `Cache ${operation} failed for ${key}: ${error.message}`;

    if (this.isProduction) {
      this.logger.error(message);
      // In production, we could throw or track metrics
      // For now, we log and continue (graceful degradation)
    } else {
      this.logger.warn(message);
    }
  }
}
