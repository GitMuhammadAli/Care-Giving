import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthEvent } from '@prisma/client';

export interface AuthLogEntry {
  event: AuthEvent;
  email: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface AuthLogFilter {
  event?: AuthEvent;
  email?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class AdminAuthLogService {
  private readonly logger = new Logger(AdminAuthLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log an authentication event
   */
  async log(entry: AuthLogEntry): Promise<void> {
    try {
      await this.prisma.authLog.create({
        data: {
          event: entry.event,
          email: entry.email.toLowerCase(),
          userId: entry.userId,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          metadata: entry.metadata as any,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log auth event: ${error.message}`);
      // Don't throw - auth logging should not break auth flow
    }
  }

  /**
   * Get auth logs with filtering and pagination
   */
  async getLogs(
    filter: AuthLogFilter,
    page: number = 1,
    limit: number = 50,
  ): Promise<{
    data: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const where: any = {};

    if (filter.event) {
      where.event = filter.event;
    }
    if (filter.email) {
      where.email = { contains: filter.email, mode: 'insensitive' };
    }
    if (filter.userId) {
      where.userId = filter.userId;
    }
    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) {
        where.createdAt.gte = filter.startDate;
      }
      if (filter.endDate) {
        where.createdAt.lte = filter.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.authLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.authLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get auth statistics
   */
  async getStats(hours: number = 24): Promise<{
    total: number;
    loginSuccess: number;
    loginFailed: number;
    passwordResets: number;
    registrations: number;
    byEvent: Record<string, number>;
    failedLoginsByEmail: Array<{ email: string; count: number }>;
  }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [byEvent, failedLogins] = await Promise.all([
      this.prisma.authLog.groupBy({
        by: ['event'],
        where: { createdAt: { gte: since } },
        _count: true,
      }),
      this.prisma.authLog.groupBy({
        by: ['email'],
        where: {
          createdAt: { gte: since },
          event: AuthEvent.LOGIN_FAILED,
        },
        _count: true,
        orderBy: { _count: { email: 'desc' } },
        take: 10,
      }),
    ]);

    const eventCounts = byEvent.reduce((acc, item) => {
      acc[item.event] = item._count;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: Object.values(eventCounts).reduce((a, b) => a + b, 0),
      loginSuccess: eventCounts[AuthEvent.LOGIN_SUCCESS] || 0,
      loginFailed: eventCounts[AuthEvent.LOGIN_FAILED] || 0,
      passwordResets:
        (eventCounts[AuthEvent.PASSWORD_RESET_REQUEST] || 0) +
        (eventCounts[AuthEvent.PASSWORD_RESET_SUCCESS] || 0),
      registrations: eventCounts[AuthEvent.REGISTER] || 0,
      byEvent: eventCounts,
      failedLoginsByEmail: failedLogins.map((item) => ({
        email: item.email,
        count: item._count,
      })),
    };
  }

  /**
   * Get recent auth logs for quick view
   */
  async getRecent(limit: number = 10): Promise<any[]> {
    return this.prisma.authLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get failed login attempts for a specific email
   */
  async getFailedAttemptsForEmail(
    email: string,
    hours: number = 24,
  ): Promise<number> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    return this.prisma.authLog.count({
      where: {
        email: email.toLowerCase(),
        event: AuthEvent.LOGIN_FAILED,
        createdAt: { gte: since },
      },
    });
  }

  /**
   * Clean up old auth logs
   */
  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const result = await this.prisma.authLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    this.logger.log(`Cleaned up ${result.count} auth logs older than ${daysToKeep} days`);
    return result.count;
  }
}

