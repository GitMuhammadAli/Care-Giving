import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class LockHelper {
  private redis: Redis;
  private readonly LOCK_PREFIX = 'lock:';

  constructor(private configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get('redis.host'),
      port: this.configService.get('redis.port'),
      password: this.configService.get('redis.password'),
    });
  }

  async acquire(key: string, ttlSeconds = 30): Promise<boolean> {
    const lockKey = `${this.LOCK_PREFIX}${key}`;
    const result = await this.redis.set(lockKey, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async release(key: string): Promise<void> {
    const lockKey = `${this.LOCK_PREFIX}${key}`;
    await this.redis.del(lockKey);
  }

  async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    options: { ttlSeconds?: number; waitMs?: number; maxAttempts?: number } = {}
  ): Promise<T> {
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

