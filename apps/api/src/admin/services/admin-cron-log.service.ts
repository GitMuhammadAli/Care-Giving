import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CronStatus } from '@prisma/client';

export interface CronLogFilter {
  jobName?: string;
  status?: CronStatus;
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class AdminCronLogService {
  private readonly logger = new Logger(AdminCronLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log the start of a cron job
   */
  async logStart(jobName: string, metadata?: Record<string, unknown>): Promise<string> {
    try {
      const log = await this.prisma.cronLog.create({
        data: {
          jobName,
          status: CronStatus.STARTED,
          metadata: metadata as any,
        },
      });
      return log.id;
    } catch (error) {
      this.logger.error(`Failed to log cron start: ${error.message}`);
      throw error;
    }
  }

  /**
   * Log the completion of a cron job
   */
  async logComplete(
    logId: string,
    itemsProcessed: number,
    startTime: Date,
  ): Promise<void> {
    try {
      const duration = Date.now() - startTime.getTime();
      await this.prisma.cronLog.update({
        where: { id: logId },
        data: {
          status: CronStatus.COMPLETED,
          duration,
          itemsProcessed,
          completedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log cron completion: ${error.message}`);
    }
  }

  /**
   * Log a failed cron job
   */
  async logFailed(logId: string, error: string, startTime: Date): Promise<void> {
    try {
      const duration = Date.now() - startTime.getTime();
      await this.prisma.cronLog.update({
        where: { id: logId },
        data: {
          status: CronStatus.FAILED,
          duration,
          error,
          completedAt: new Date(),
        },
      });
    } catch (err) {
      this.logger.error(`Failed to log cron failure: ${err.message}`);
    }
  }

  /**
   * Get cron logs with filtering and pagination
   */
  async getLogs(
    filter: CronLogFilter,
    page: number = 1,
    limit: number = 50,
  ): Promise<{
    data: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const where: any = {};

    if (filter.jobName) {
      where.jobName = filter.jobName;
    }
    if (filter.status) {
      where.status = filter.status;
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
      this.prisma.cronLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.cronLog.count({ where }),
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
   * Get cron statistics
   */
  async getStats(hours: number = 24): Promise<{
    total: number;
    completed: number;
    failed: number;
    running: number;
    avgDuration: number;
    byJob: Array<{
      jobName: string;
      total: number;
      completed: number;
      failed: number;
      avgDuration: number;
    }>;
  }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [byStatus, byJob, avgDuration] = await Promise.all([
      this.prisma.cronLog.groupBy({
        by: ['status'],
        where: { createdAt: { gte: since } },
        _count: true,
      }),
      this.prisma.cronLog.groupBy({
        by: ['jobName', 'status'],
        where: { createdAt: { gte: since } },
        _count: true,
        _avg: { duration: true },
      }),
      this.prisma.cronLog.aggregate({
        where: {
          createdAt: { gte: since },
          status: CronStatus.COMPLETED,
          duration: { not: null },
        },
        _avg: { duration: true },
      }),
    ]);

    const statusCounts = byStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count;
        return acc;
      },
      { STARTED: 0, COMPLETED: 0, FAILED: 0 } as Record<string, number>,
    );

    // Aggregate by job name
    const jobStats: Record<string, { total: number; completed: number; failed: number; durations: number[] }> = {};
    byJob.forEach((item) => {
      if (!jobStats[item.jobName]) {
        jobStats[item.jobName] = { total: 0, completed: 0, failed: 0, durations: [] };
      }
      jobStats[item.jobName].total += item._count;
      if (item.status === CronStatus.COMPLETED) {
        jobStats[item.jobName].completed += item._count;
        if (item._avg.duration) {
          jobStats[item.jobName].durations.push(item._avg.duration);
        }
      }
      if (item.status === CronStatus.FAILED) {
        jobStats[item.jobName].failed += item._count;
      }
    });

    return {
      total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
      completed: statusCounts.COMPLETED || 0,
      failed: statusCounts.FAILED || 0,
      running: statusCounts.STARTED || 0,
      avgDuration: Math.round(avgDuration._avg.duration || 0),
      byJob: Object.entries(jobStats).map(([jobName, stats]) => ({
        jobName,
        total: stats.total,
        completed: stats.completed,
        failed: stats.failed,
        avgDuration: stats.durations.length > 0
          ? Math.round(stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length)
          : 0,
      })),
    };
  }

  /**
   * Get recent cron logs for quick view
   */
  async getRecent(limit: number = 10): Promise<any[]> {
    return this.prisma.cronLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get list of all job names
   */
  async getJobNames(): Promise<string[]> {
    const jobs = await this.prisma.cronLog.groupBy({
      by: ['jobName'],
    });
    return jobs.map((j) => j.jobName);
  }

  /**
   * Clean up old cron logs
   */
  async cleanupOldLogs(daysToKeep: number = 30): Promise<number> {
    const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const result = await this.prisma.cronLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    this.logger.log(`Cleaned up ${result.count} cron logs older than ${daysToKeep} days`);
    return result.count;
  }
}

