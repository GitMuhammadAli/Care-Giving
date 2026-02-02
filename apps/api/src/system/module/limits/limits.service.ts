import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  RESOURCE_LIMITS,
  ResourceType,
  PeriodType,
  getPeriodStart,
} from './limits.constants';

export interface UsageStatus {
  resource: ResourceType;
  count: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  isAtLimit: boolean;
  isWarning: boolean;
}

@Injectable()
export class LimitsService {
  private readonly logger = new Logger(LimitsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if resource usage is within limits
   */
  async checkLimit(
    resource: ResourceType,
    periodType: PeriodType,
    incrementBy: number = 1,
  ): Promise<{ allowed: boolean; status: UsageStatus }> {
    const periodStart = getPeriodStart(periodType);
    const limit = this.getResourceLimit(resource, periodType);

    const usage = await this.prisma.usageTracking.findUnique({
      where: {
        resource_periodType_periodStart: {
          resource,
          periodType,
          periodStart,
        },
      },
    });

    const currentCount = usage?.count || 0;
    const newCount = currentCount + incrementBy;
    const allowed = newCount <= limit;

    const status: UsageStatus = {
      resource,
      count: currentCount,
      limit,
      remaining: Math.max(0, limit - currentCount),
      percentUsed: Math.round((currentCount / limit) * 100),
      isAtLimit: currentCount >= limit,
      isWarning: currentCount >= this.getWarningThreshold(resource, periodType),
    };

    if (status.isWarning && !status.isAtLimit) {
      this.logger.warn(
        `Resource ${resource} at ${status.percentUsed}% (${status.count}/${status.limit})`,
      );
    }

    return { allowed, status };
  }

  /**
   * Increment usage counter
   */
  async incrementUsage(
    resource: ResourceType,
    periodType: PeriodType,
    incrementBy: number = 1,
  ): Promise<UsageStatus> {
    const periodStart = getPeriodStart(periodType);
    const limit = this.getResourceLimit(resource, periodType);

    const usage = await this.prisma.usageTracking.upsert({
      where: {
        resource_periodType_periodStart: {
          resource,
          periodType,
          periodStart,
        },
      },
      create: {
        resource,
        periodType,
        periodStart,
        count: incrementBy,
        limit,
      },
      update: {
        count: { increment: incrementBy },
      },
    });

    const status: UsageStatus = {
      resource,
      count: usage.count,
      limit: usage.limit,
      remaining: Math.max(0, usage.limit - usage.count),
      percentUsed: Math.round((usage.count / usage.limit) * 100),
      isAtLimit: usage.count >= usage.limit,
      isWarning: usage.count >= this.getWarningThreshold(resource, periodType),
    };

    if (status.isAtLimit) {
      this.logger.error(
        `Resource ${resource} has reached its limit (${status.count}/${status.limit})`,
      );
    }

    return status;
  }

  /**
   * Get current usage without incrementing
   */
  async getUsage(
    resource: ResourceType,
    periodType: PeriodType,
  ): Promise<UsageStatus> {
    const periodStart = getPeriodStart(periodType);
    const limit = this.getResourceLimit(resource, periodType);

    const usage = await this.prisma.usageTracking.findUnique({
      where: {
        resource_periodType_periodStart: {
          resource,
          periodType,
          periodStart,
        },
      },
    });

    const count = usage?.count || 0;

    return {
      resource,
      count,
      limit,
      remaining: Math.max(0, limit - count),
      percentUsed: Math.round((count / limit) * 100),
      isAtLimit: count >= limit,
      isWarning: count >= this.getWarningThreshold(resource, periodType),
    };
  }

  /**
   * Get all usage stats for admin dashboard
   */
  async getAllUsageStats(): Promise<UsageStatus[]> {
    const stats: UsageStatus[] = [];

    // Daily resources
    const dailyResources = [ResourceType.EMAILS_SENT, ResourceType.REDIS_COMMANDS];
    for (const resource of dailyResources) {
      stats.push(await this.getUsage(resource, PeriodType.DAILY));
    }

    // Monthly resources
    const monthlyResources = [
      ResourceType.FILE_UPLOADS,
      ResourceType.RABBITMQ_MESSAGES,
    ];
    for (const resource of monthlyResources) {
      stats.push(await this.getUsage(resource, PeriodType.MONTHLY));
    }

    return stats;
  }

  /**
   * Get resource limit from config
   */
  private getResourceLimit(resource: ResourceType, periodType: PeriodType): number {
    switch (resource) {
      case ResourceType.EMAILS_SENT:
        return RESOURCE_LIMITS.EMAILS_PER_DAY.appLimit;
      case ResourceType.FILE_UPLOADS:
        return RESOURCE_LIMITS.FILE_UPLOADS_PER_MONTH.appLimit;
      case ResourceType.REDIS_COMMANDS:
        return RESOURCE_LIMITS.REDIS_COMMANDS_PER_DAY.appLimit;
      case ResourceType.RABBITMQ_MESSAGES:
        return RESOURCE_LIMITS.RABBITMQ_MESSAGES_PER_MONTH.appLimit;
      case ResourceType.API_REQUESTS:
        return RESOURCE_LIMITS.API_REQUESTS_PER_MINUTE.limit;
      default:
        return 10000; // Default high limit
    }
  }

  /**
   * Get warning threshold for a resource
   */
  private getWarningThreshold(resource: ResourceType, periodType: PeriodType): number {
    switch (resource) {
      case ResourceType.EMAILS_SENT:
        return RESOURCE_LIMITS.EMAILS_PER_DAY.warningThreshold;
      case ResourceType.FILE_UPLOADS:
        return RESOURCE_LIMITS.FILE_UPLOADS_PER_MONTH.warningThreshold;
      case ResourceType.REDIS_COMMANDS:
        return RESOURCE_LIMITS.REDIS_COMMANDS_PER_DAY.warningThreshold;
      case ResourceType.RABBITMQ_MESSAGES:
        return RESOURCE_LIMITS.RABBITMQ_MESSAGES_PER_MONTH.warningThreshold;
      default:
        return Math.floor(this.getResourceLimit(resource, periodType) * 0.8);
    }
  }
}

