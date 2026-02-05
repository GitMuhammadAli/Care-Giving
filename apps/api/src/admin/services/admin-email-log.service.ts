import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailStatus } from '@prisma/client';

export interface EmailLogEntry {
  to: string;
  subject: string;
  template?: string;
  provider: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface EmailLogFilter {
  status?: EmailStatus;
  provider?: string;
  userId?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class AdminEmailLogService {
  private readonly logger = new Logger(AdminEmailLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log an email send attempt
   */
  async logEmail(entry: EmailLogEntry): Promise<string> {
    try {
      const log = await this.prisma.emailLog.create({
        data: {
          to: entry.to,
          subject: entry.subject,
          template: entry.template,
          provider: entry.provider,
          status: EmailStatus.PENDING,
          userId: entry.userId,
          metadata: entry.metadata as any,
        },
      });
      return log.id;
    } catch (error) {
      this.logger.error(`Failed to log email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark an email as sent
   */
  async markSent(logId: string): Promise<void> {
    try {
      await this.prisma.emailLog.update({
        where: { id: logId },
        data: {
          status: EmailStatus.SENT,
          sentAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to mark email as sent: ${error.message}`);
    }
  }

  /**
   * Mark an email as failed
   */
  async markFailed(logId: string, error: string): Promise<void> {
    try {
      await this.prisma.emailLog.update({
        where: { id: logId },
        data: {
          status: EmailStatus.FAILED,
          error,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to mark email as failed: ${err.message}`);
    }
  }

  /**
   * Get email logs with filtering and pagination
   */
  async getLogs(
    filter: EmailLogFilter,
    page: number = 1,
    limit: number = 50,
  ): Promise<{
    data: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const where: any = {};

    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.provider) {
      where.provider = filter.provider;
    }
    if (filter.userId) {
      where.userId = filter.userId;
    }
    if (filter.search) {
      where.OR = [
        { to: { contains: filter.search, mode: 'insensitive' } },
        { subject: { contains: filter.search, mode: 'insensitive' } },
      ];
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
      this.prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.emailLog.count({ where }),
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
   * Get email statistics
   */
  async getStats(hours: number = 24): Promise<{
    total: number;
    sent: number;
    failed: number;
    pending: number;
    byProvider: Record<string, number>;
    byTemplate: Record<string, number>;
  }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [stats, byProvider, byTemplate] = await Promise.all([
      this.prisma.emailLog.groupBy({
        by: ['status'],
        where: { createdAt: { gte: since } },
        _count: true,
      }),
      this.prisma.emailLog.groupBy({
        by: ['provider'],
        where: { createdAt: { gte: since } },
        _count: true,
      }),
      this.prisma.emailLog.groupBy({
        by: ['template'],
        where: { createdAt: { gte: since }, template: { not: null } },
        _count: true,
      }),
    ]);

    const statusCounts = stats.reduce(
      (acc, item) => {
        acc[item.status] = item._count;
        return acc;
      },
      { PENDING: 0, SENT: 0, FAILED: 0 } as Record<string, number>,
    );

    return {
      total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
      sent: statusCounts.SENT || 0,
      failed: statusCounts.FAILED || 0,
      pending: statusCounts.PENDING || 0,
      byProvider: byProvider.reduce((acc, item) => {
        acc[item.provider] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byTemplate: byTemplate.reduce((acc, item) => {
        if (item.template) {
          acc[item.template] = item._count;
        }
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Get recent email logs for quick view
   */
  async getRecent(limit: number = 10): Promise<any[]> {
    return this.prisma.emailLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Clean up old email logs
   */
  async cleanupOldLogs(daysToKeep: number = 30): Promise<number> {
    const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const result = await this.prisma.emailLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    this.logger.log(`Cleaned up ${result.count} email logs older than ${daysToKeep} days`);
    return result.count;
  }
}

