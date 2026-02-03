import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService - Database connection service
 *
 * FREE-TIER OPTIMIZATION (Neon: connection pooler, limited compute):
 * - Uses connection pooler URL (-pooler in hostname)
 * - Lazy connection to reduce idle connections
 * - Proper cleanup on shutdown
 * - Minimal logging in production
 * - Retry logic for Neon cold starts (auto-suspend after inactivity)
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  // Neon cold start retry configuration
  private readonly MAX_RETRIES = 5;
  private readonly INITIAL_DELAY_MS = 2000; // 2 seconds
  private readonly MAX_DELAY_MS = 10000; // 10 seconds

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'], // Production: only errors to reduce overhead
      // FREE-TIER: Connection optimizations for Neon pooler
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  /**
   * Connect to database with retry logic for Neon cold starts
   * Neon free tier suspends after ~5 min of inactivity and takes 5-10s to wake
   */
  private async connectWithRetry(attempt = 1): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully');
    } catch (error) {
      if (attempt >= this.MAX_RETRIES) {
        this.logger.error(`Database connection failed after ${this.MAX_RETRIES} attempts: ${error.message}`);
        throw error;
      }

      // Exponential backoff with cap
      const delay = Math.min(this.INITIAL_DELAY_MS * Math.pow(2, attempt - 1), this.MAX_DELAY_MS);
      this.logger.warn(`Database connection attempt ${attempt}/${this.MAX_RETRIES} failed. Retrying in ${delay}ms... (Neon may be waking up)`);

      await this.sleep(delay);
      return this.connectWithRetry(attempt + 1);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  /**
   * Health check method - lightweight query with retry for Neon cold starts
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      // Try to reconnect if health check fails (Neon may have suspended)
      try {
        await this.connectWithRetry();
        await this.$queryRaw`SELECT 1`;
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Execute a database operation with automatic retry for Neon cold starts
   * Use this for critical operations that must succeed
   */
  async withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Check if it's a connection error (Neon suspended)
        const isConnectionError =
          error.code === 'P1001' || // Can't reach database
          error.code === 'P1002' || // Database server timed out
          error.message?.includes('Connection') ||
          error.message?.includes('ECONNREFUSED');

        if (!isConnectionError || attempt === maxRetries) {
          throw error;
        }

        const delay = Math.min(this.INITIAL_DELAY_MS * attempt, this.MAX_DELAY_MS);
        this.logger.warn(`Database operation failed (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`);

        await this.sleep(delay);

        // Try to reconnect before retrying
        try {
          await this.$connect();
        } catch {
          // Ignore reconnect errors, the operation retry will surface any issues
        }
      }
    }

    throw lastError;
  }
}













