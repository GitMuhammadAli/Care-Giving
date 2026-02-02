import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { LogLevel } from '@prisma/client';

export interface LogEntry {
  level: LogLevel;
  message: string;
  service: string;
  context?: string;
  requestId?: string;
  userId?: string;
  error?: Error;
  metadata?: Record<string, unknown>;
}

export interface LogFilter {
  level?: LogLevel;
  service?: string;
  userId?: string;
  requestId?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface LogStats {
  total: number;
  byLevel: Record<string, number>;
  byService: Record<string, number>;
  recentErrors: number;
}

@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);
  private readonly buffer: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly BUFFER_SIZE = 50;
  private readonly FLUSH_INTERVAL_MS = 5000; // 5 seconds

  constructor(private readonly prisma: PrismaService) {
    // Start background flush for batching log writes
    this.startFlushInterval();
  }

  /**
   * Log a message to the database (batched for performance)
   */
  async log(entry: LogEntry): Promise<void> {
    this.buffer.push(entry);

    // Flush immediately if buffer is full or if it's an error
    if (this.buffer.length >= this.BUFFER_SIZE || entry.level === LogLevel.ERROR || entry.level === LogLevel.FATAL) {
      await this.flush();
    }
  }

  /**
   * Log debug message
   */
  async debug(message: string, service: string, context?: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.log({ level: LogLevel.DEBUG, message, service, context, metadata });
  }

  /**
   * Log info message
   */
  async info(message: string, service: string, context?: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.log({ level: LogLevel.INFO, message, service, context, metadata });
  }

  /**
   * Log warning message
   */
  async warn(message: string, service: string, context?: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.log({ level: LogLevel.WARN, message, service, context, metadata });
  }

  /**
   * Log error message
   */
  async error(
    message: string,
    service: string,
    error?: Error,
    context?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      level: LogLevel.ERROR,
      message,
      service,
      context,
      error,
      metadata,
    });
  }

  /**
   * Log fatal error message
   */
  async fatal(
    message: string,
    service: string,
    error?: Error,
    context?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      level: LogLevel.FATAL,
      message,
      service,
      context,
      error,
      metadata,
    });
  }

  /**
   * Get logs with filtering and pagination
   */
  async getLogs(
    filter: LogFilter,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ logs: any[]; total: number; page: number; totalPages: number }> {
    const where: any = {};

    if (filter.level) {
      where.level = filter.level;
    }
    if (filter.service) {
      where.service = filter.service;
    }
    if (filter.userId) {
      where.userId = filter.userId;
    }
    if (filter.requestId) {
      where.requestId = filter.requestId;
    }
    if (filter.search) {
      where.message = { contains: filter.search, mode: 'insensitive' };
    }
    if (filter.startDate || filter.endDate) {
      where.timestamp = {};
      if (filter.startDate) {
        where.timestamp.gte = filter.startDate;
      }
      if (filter.endDate) {
        where.timestamp.lte = filter.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.applicationLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.applicationLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get log statistics for dashboard
   */
  async getStats(hours: number = 24): Promise<LogStats> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [total, byLevel, byService, recentErrors] = await Promise.all([
      this.prisma.applicationLog.count({
        where: { timestamp: { gte: since } },
      }),
      this.prisma.applicationLog.groupBy({
        by: ['level'],
        where: { timestamp: { gte: since } },
        _count: true,
      }),
      this.prisma.applicationLog.groupBy({
        by: ['service'],
        where: { timestamp: { gte: since } },
        _count: true,
      }),
      this.prisma.applicationLog.count({
        where: {
          timestamp: { gte: since },
          level: { in: [LogLevel.ERROR, LogLevel.FATAL] },
        },
      }),
    ]);

    return {
      total,
      byLevel: byLevel.reduce((acc, item) => {
        acc[item.level] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byService: byService.reduce((acc, item) => {
        acc[item.service] = item._count;
        return acc;
      }, {} as Record<string, number>),
      recentErrors,
    };
  }

  /**
   * Get recent errors for quick view
   */
  async getRecentErrors(limit: number = 10): Promise<any[]> {
    return this.prisma.applicationLog.findMany({
      where: {
        level: { in: [LogLevel.ERROR, LogLevel.FATAL] },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Delete old logs (retention policy)
   */
  async cleanupOldLogs(daysToKeep: number = 30): Promise<number> {
    const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const result = await this.prisma.applicationLog.deleteMany({
      where: { timestamp: { lt: cutoff } },
    });

    this.logger.log(`Cleaned up ${result.count} logs older than ${daysToKeep} days`);
    return result.count;
  }

  /**
   * Flush buffered logs to database
   */
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer.length = 0;

    try {
      await this.prisma.applicationLog.createMany({
        data: entries.map((entry) => ({
          level: entry.level,
          message: entry.message,
          service: entry.service,
          context: entry.context,
          requestId: entry.requestId,
          userId: entry.userId,
          errorStack: entry.error?.stack,
          metadata: entry.metadata as any,
        })),
      });
    } catch (error) {
      // Log to console if database write fails
      this.logger.error(`Failed to flush logs to database: ${error.message}`);
      // Re-add to buffer for retry (but limit to prevent memory issues)
      if (this.buffer.length < this.BUFFER_SIZE * 2) {
        this.buffer.push(...entries);
      }
    }
  }

  /**
   * Start the flush interval for batching
   */
  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => {
      this.flush().catch((err) => {
        this.logger.error(`Background log flush failed: ${err.message}`);
      });
    }, this.FLUSH_INTERVAL_MS);
  }

  /**
   * Stop flush interval and flush remaining logs
   */
  async onModuleDestroy(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flush();
  }
}

