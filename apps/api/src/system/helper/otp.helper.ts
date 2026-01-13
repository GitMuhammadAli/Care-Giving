import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as crypto from 'crypto';

@Injectable()
export class OtpHelper {
  private readonly logger = new Logger(OtpHelper.name);
  private redis: Redis;
  private readonly OTP_PREFIX = 'otp:';
  private readonly expiresIn: number;
  private redisConnected = false;
  // In-memory fallback for development when Redis is unavailable
  private inMemoryStore = new Map<string, { otp: string; expiresAt: number }>();

  constructor(private configService: ConfigService) {
    const redisConfig = this.configService.get('redis');
    const host = redisConfig?.host || 'localhost';
    const port = redisConfig?.port || 6379;
    const password = redisConfig?.password;
    const useTls = redisConfig?.tls === true;

    const ioredisConfig: any = {
      host,
      port,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 3) {
          this.logger.warn('Redis connection failed, falling back to in-memory OTP storage');
          return null;
        }
        return Math.min(times * 200, 1000);
      },
    };

    // Only add password if it's set and not empty
    if (password && password.trim() !== '') {
      ioredisConfig.password = password;
    }

    // Add TLS if configured
    if (useTls) {
      ioredisConfig.tls = {};
    }

    this.logger.log(`Connecting to Redis at ${host}:${port} (TLS: ${useTls})`);
    this.redis = new Redis(ioredisConfig);

    this.redis.on('connect', () => {
      this.redisConnected = true;
      this.logger.log('Redis connected');
    });

    this.redis.on('error', (err) => {
      this.redisConnected = false;
      this.logger.warn(`Redis error: ${err.message}`);
    });

    const securityConfig = this.configService.get('security');
    this.expiresIn = securityConfig?.otpExpiresIn || 300;
  }

  async generate(identifier: string, purpose: string): Promise<string> {
    const otp = crypto.randomInt(100000, 999999).toString();
    const key = `${this.OTP_PREFIX}${purpose}:${identifier}`;

    try {
      if (this.redisConnected) {
        await this.redis.setex(key, this.expiresIn, otp);
        this.logger.debug(`OTP stored in Redis for ${identifier}`);
      } else {
        throw new Error('Redis not connected');
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
      if (this.redisConnected) {
        const storedOtp = await this.redis.get(key);

        if (!storedOtp || storedOtp !== otp) {
          return false;
        }

        // Delete OTP after successful verification
        await this.redis.del(key);
        return true;
      } else {
        throw new Error('Redis not connected');
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
      if (this.redisConnected) {
        await this.redis.del(key);
      } else {
        throw new Error('Redis not connected');
      }
    } catch {
      this.inMemoryStore.delete(key);
    }
  }
}
