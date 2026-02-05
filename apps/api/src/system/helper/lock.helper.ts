import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT, isRedisReady } from '../module/cache/redis.provider';

@Injectable()
export class LockHelper {
  private readonly logger = new Logger(LockHelper.name);
  private readonly LOCK_PREFIX = 'lock:';

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis | null) {
    if (isRedisReady(this.redis)) {
      this.logger.log('LockHelper using shared Redis connection');
    } else {
      this.logger.warn('LockHelper disabled (Redis unavailable) - locks will be no-ops');
    }
  }

  private isRedisAvailable(): boolean {
    return isRedisReady(this.redis);
  }

  async acquire(key: string, ttlSeconds = 30): Promise<boolean> {
    if (!this.isRedisAvailable()) {
      // In development without Redis, always return true (no locking)
      return true;
    }
    const lockKey = `${this.LOCK_PREFIX}${key}`;
    const result = await this.redis!.set(lockKey, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async release(key: string): Promise<void> {
    if (!this.isRedisAvailable()) {
      return;
    }
    const lockKey = `${this.LOCK_PREFIX}${key}`;
    await this.redis!.del(lockKey);
  }

  /**
   * Check if a key exists (for idempotency tracking)
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isRedisAvailable()) {
      return false;
    }
    const result = await this.redis!.exists(`${this.LOCK_PREFIX}${key}`);
    return result === 1;
  }

  /**
   * Set a key with optional TTL (for idempotency markers)
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isRedisAvailable()) {
      return;
    }
    const fullKey = `${this.LOCK_PREFIX}${key}`;
    if (ttlSeconds) {
      await this.redis!.set(fullKey, value, 'EX', ttlSeconds);
    } else {
      await this.redis!.set(fullKey, value);
    }
  }

  /**
   * Get a value by key
   */
  async get(key: string): Promise<string | null> {
    if (!this.isRedisAvailable()) {
      return null;
    }
    return this.redis!.get(`${this.LOCK_PREFIX}${key}`);
  }

  async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    options: { ttlSeconds?: number; waitMs?: number; maxAttempts?: number } = {}
  ): Promise<T> {
    if (!this.isRedisAvailable()) {
      // In development without Redis, just run the function (no locking)
      return fn();
    }

    const { ttlSeconds = 30, waitMs = 100, maxAttempts = 50 } = options;
    
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const acquired = await this.acquire(key, ttlSeconds);
      
      if (acquired) {
        try {
          return await fn();
        } finally {
          await this.release(key);
        }
      }
      
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    
    throw new Error(`Failed to acquire lock for key: ${key}`);
  }
}

