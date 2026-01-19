import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import { REDIS_CLIENT, isRedisReady } from '../module/cache/redis.provider';

@Injectable()
export class OtpHelper {
  private readonly logger = new Logger(OtpHelper.name);
  private readonly OTP_PREFIX = 'otp:';
  private readonly expiresIn: number;
  // In-memory fallback for development when Redis is unavailable
  private inMemoryStore = new Map<string, { otp: string; expiresAt: number }>();

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
    private configService: ConfigService,
  ) {
    const securityConfig = this.configService.get('security');
    this.expiresIn = securityConfig?.otpExpiresIn || 300;

    if (this.isRedisAvailable()) {
      this.logger.log('OtpHelper using shared Redis connection');
    } else {
      this.logger.warn('OtpHelper using in-memory storage (Redis unavailable)');
    }
  }

  private isRedisAvailable(): boolean {
    return isRedisReady(this.redis);
  }

  async generate(identifier: string, purpose: string): Promise<string> {
    const otp = crypto.randomInt(100000, 999999).toString();
    const key = `${this.OTP_PREFIX}${purpose}:${identifier}`;

    try {
      if (this.isRedisAvailable()) {
        await this.redis!.setex(key, this.expiresIn, otp);
        this.logger.debug(`OTP stored in Redis for ${identifier}`);
      } else {
        throw new Error('Redis not available');
      }
    } catch {
      // Fallback to in-memory storage
      this.inMemoryStore.set(key, {
        otp,
        expiresAt: Date.now() + this.expiresIn * 1000,
      });
      this.logger.debug(`OTP stored in memory for ${identifier}`);
    }

    return otp;
  }

  async verify(identifier: string, purpose: string, otp: string): Promise<boolean> {
    const key = `${this.OTP_PREFIX}${purpose}:${identifier}`;

    try {
      if (this.isRedisAvailable()) {
        const storedOtp = await this.redis!.get(key);

        if (!storedOtp || storedOtp !== otp) {
          return false;
        }

        // Delete OTP after successful verification
        await this.redis!.del(key);
        return true;
      } else {
        throw new Error('Redis not available');
      }
    } catch {
      // Fallback to in-memory storage
      const stored = this.inMemoryStore.get(key);
      if (!stored || stored.otp !== otp || Date.now() > stored.expiresAt) {
        return false;
      }
      this.inMemoryStore.delete(key);
      return true;
    }
  }

  async invalidate(identifier: string, purpose: string): Promise<void> {
    const key = `${this.OTP_PREFIX}${purpose}:${identifier}`;

    try {
      if (this.isRedisAvailable()) {
        await this.redis!.del(key);
      } else {
        throw new Error('Redis not available');
      }
    } catch {
      this.inMemoryStore.delete(key);
    }
  }
}
