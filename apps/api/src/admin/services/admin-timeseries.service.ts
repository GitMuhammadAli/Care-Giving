import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LogLevel, EmailStatus, AuthEvent, CronStatus } from '@prisma/client';

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

export interface TimeSeriesData {
  data: TimeSeriesPoint[];
  total: number;
  interval: 'hour' | 'day';
}

@Injectable()
export class AdminTimeSeriesService {
  private readonly logger = new Logger(AdminTimeSeriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get request count time series from application logs
   */
  async getRequestTimeSeries(hours: number = 24): Promise<TimeSeriesData> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const interval = hours <= 24 ? 'hour' : 'day';

    // Use raw query for time bucket aggregation
    const results = await this.prisma.$queryRaw<Array<{ bucket: Date; count: bigint }>>`
      SELECT 
        date_trunc(${interval}, timestamp) as bucket,
        COUNT(*) as count
      FROM "ApplicationLog"
      WHERE timestamp >= ${since}
        AND service = 'api'
        AND message LIKE '%HTTP%'
      GROUP BY bucket
      ORDER BY bucket ASC
    `;

    const data = results.map((row) => ({
      timestamp: row.bucket.toISOString(),
      value: Number(row.count),
    }));

    const total = data.reduce((sum, point) => sum + point.value, 0);

    return { data, total, interval };
  }

  /**
   * Get error count time series
   */
  async getErrorTimeSeries(hours: number = 24): Promise<TimeSeriesData> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const interval = hours <= 24 ? 'hour' : 'day';

    const results = await this.prisma.$queryRaw<Array<{ bucket: Date; count: bigint }>>`
      SELECT 
        date_trunc(${interval}, timestamp) as bucket,
        COUNT(*) as count
      FROM "ApplicationLog"
      WHERE timestamp >= ${since}
        AND level IN ('ERROR', 'FATAL')
      GROUP BY bucket
      ORDER BY bucket ASC
    `;

    const data = results.map((row) => ({
      timestamp: row.bucket.toISOString(),
      value: Number(row.count),
    }));

    const total = data.reduce((sum, point) => sum + point.value, 0);

    return { data, total, interval };
  }

  /**
   * Get response time percentiles from application logs
   */
  async getResponseTimeStats(hours: number = 24): Promise<{
    avg: number;
    p50: number;
    p95: number;
    p99: number;
    timeSeries: TimeSeriesPoint[];
  }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const interval = hours <= 24 ? 'hour' : 'day';

    // Extract duration from metadata JSON
    const stats = await this.prisma.$queryRaw<Array<{
      avg_duration: number | null;
      p50: number | null;
      p95: number | null;
      p99: number | null;
    }>>`
      SELECT 
        AVG((metadata->>'duration')::numeric) as avg_duration,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY (metadata->>'duration')::numeric) as p50,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (metadata->>'duration')::numeric) as p95,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY (metadata->>'duration')::numeric) as p99
      FROM "ApplicationLog"
      WHERE timestamp >= ${since}
        AND service = 'api'
        AND metadata->>'duration' IS NOT NULL
    `;

    const timeSeries = await this.prisma.$queryRaw<Array<{ bucket: Date; avg_duration: number }>>`
      SELECT 
        date_trunc(${interval}, timestamp) as bucket,
        AVG((metadata->>'duration')::numeric) as avg_duration
      FROM "ApplicationLog"
      WHERE timestamp >= ${since}
        AND service = 'api'
        AND metadata->>'duration' IS NOT NULL
      GROUP BY bucket
      ORDER BY bucket ASC
    `;

    return {
      avg: Math.round(stats[0]?.avg_duration || 0),
      p50: Math.round(stats[0]?.p50 || 0),
      p95: Math.round(stats[0]?.p95 || 0),
      p99: Math.round(stats[0]?.p99 || 0),
      timeSeries: timeSeries.map((row) => ({
        timestamp: row.bucket.toISOString(),
        value: Math.round(row.avg_duration || 0),
      })),
    };
  }

  /**
   * Get email send time series
   */
  async getEmailTimeSeries(hours: number = 24): Promise<{
    sent: TimeSeriesData;
    failed: TimeSeriesData;
  }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const interval = hours <= 24 ? 'hour' : 'day';

    const [sentResults, failedResults] = await Promise.all([
      this.prisma.$queryRaw<Array<{ bucket: Date; count: bigint }>>`
        SELECT 
          date_trunc(${interval}, "createdAt") as bucket,
          COUNT(*) as count
        FROM "EmailLog"
        WHERE "createdAt" >= ${since}
          AND status = 'SENT'
        GROUP BY bucket
        ORDER BY bucket ASC
      `,
      this.prisma.$queryRaw<Array<{ bucket: Date; count: bigint }>>`
        SELECT 
          date_trunc(${interval}, "createdAt") as bucket,
          COUNT(*) as count
        FROM "EmailLog"
        WHERE "createdAt" >= ${since}
          AND status = 'FAILED'
        GROUP BY bucket
        ORDER BY bucket ASC
      `,
    ]);

    const sentData = sentResults.map((row) => ({
      timestamp: row.bucket.toISOString(),
      value: Number(row.count),
    }));

    const failedData = failedResults.map((row) => ({
      timestamp: row.bucket.toISOString(),
      value: Number(row.count),
    }));

    return {
      sent: {
        data: sentData,
        total: sentData.reduce((sum, point) => sum + point.value, 0),
        interval,
      },
      failed: {
        data: failedData,
        total: failedData.reduce((sum, point) => sum + point.value, 0),
        interval,
      },
    };
  }

  /**
   * Get auth events time series
   */
  async getAuthTimeSeries(hours: number = 24): Promise<{
    loginSuccess: TimeSeriesData;
    loginFailed: TimeSeriesData;
    registrations: TimeSeriesData;
  }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const interval = hours <= 24 ? 'hour' : 'day';

    const [loginSuccessResults, loginFailedResults, registerResults] = await Promise.all([
      this.prisma.$queryRaw<Array<{ bucket: Date; count: bigint }>>`
        SELECT 
          date_trunc(${interval}, "createdAt") as bucket,
          COUNT(*) as count
        FROM "AuthLog"
        WHERE "createdAt" >= ${since}
          AND event = 'LOGIN_SUCCESS'
        GROUP BY bucket
        ORDER BY bucket ASC
      `,
      this.prisma.$queryRaw<Array<{ bucket: Date; count: bigint }>>`
        SELECT 
          date_trunc(${interval}, "createdAt") as bucket,
          COUNT(*) as count
        FROM "AuthLog"
        WHERE "createdAt" >= ${since}
          AND event = 'LOGIN_FAILED'
        GROUP BY bucket
        ORDER BY bucket ASC
      `,
      this.prisma.$queryRaw<Array<{ bucket: Date; count: bigint }>>`
        SELECT 
          date_trunc(${interval}, "createdAt") as bucket,
          COUNT(*) as count
        FROM "AuthLog"
        WHERE "createdAt" >= ${since}
          AND event = 'REGISTER'
        GROUP BY bucket
        ORDER BY bucket ASC
      `,
    ]);

    const mapResults = (results: Array<{ bucket: Date; count: bigint }>): TimeSeriesData => {
      const data = results.map((row) => ({
        timestamp: row.bucket.toISOString(),
        value: Number(row.count),
      }));
      return {
        data,
        total: data.reduce((sum, point) => sum + point.value, 0),
        interval,
      };
    };

    return {
      loginSuccess: mapResults(loginSuccessResults),
      loginFailed: mapResults(loginFailedResults),
      registrations: mapResults(registerResults),
    };
  }

  /**
   * Get cron job execution time series
   */
  async getCronTimeSeries(hours: number = 24): Promise<{
    completed: TimeSeriesData;
    failed: TimeSeriesData;
    avgDuration: TimeSeriesPoint[];
  }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const interval = hours <= 24 ? 'hour' : 'day';

    const [completedResults, failedResults, durationResults] = await Promise.all([
      this.prisma.$queryRaw<Array<{ bucket: Date; count: bigint }>>`
        SELECT 
          date_trunc(${interval}, "createdAt") as bucket,
          COUNT(*) as count
        FROM "CronLog"
        WHERE "createdAt" >= ${since}
          AND status = 'COMPLETED'
        GROUP BY bucket
        ORDER BY bucket ASC
      `,
      this.prisma.$queryRaw<Array<{ bucket: Date; count: bigint }>>`
        SELECT 
          date_trunc(${interval}, "createdAt") as bucket,
          COUNT(*) as count
        FROM "CronLog"
        WHERE "createdAt" >= ${since}
          AND status = 'FAILED'
        GROUP BY bucket
        ORDER BY bucket ASC
      `,
      this.prisma.$queryRaw<Array<{ bucket: Date; avg_duration: number }>>`
        SELECT 
          date_trunc(${interval}, "createdAt") as bucket,
          AVG(duration) as avg_duration
        FROM "CronLog"
        WHERE "createdAt" >= ${since}
          AND status = 'COMPLETED'
          AND duration IS NOT NULL
        GROUP BY bucket
        ORDER BY bucket ASC
      `,
    ]);

    const mapResults = (results: Array<{ bucket: Date; count: bigint }>): TimeSeriesData => {
      const data = results.map((row) => ({
        timestamp: row.bucket.toISOString(),
        value: Number(row.count),
      }));
      return {
        data,
        total: data.reduce((sum, point) => sum + point.value, 0),
        interval,
      };
    };

    return {
      completed: mapResults(completedResults),
      failed: mapResults(failedResults),
      avgDuration: durationResults.map((row) => ({
        timestamp: row.bucket.toISOString(),
        value: Math.round(row.avg_duration || 0),
      })),
    };
  }

  /**
   * Get real-time monitoring stats (for WebSocket updates)
   */
  async getRealtimeStats(): Promise<{
    requestsLastMinute: number;
    errorsLastMinute: number;
    activeUsers: number;
    avgResponseTime: number;
    emailsSentToday: number;
    cronJobsRunning: number;
  }> {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [requests, errors, activeUsers, avgResponse, emailsSent, cronRunning] = await Promise.all([
      this.prisma.applicationLog.count({
        where: {
          timestamp: { gte: oneMinuteAgo },
          service: 'api',
          message: { contains: 'HTTP' },
        },
      }),
      this.prisma.applicationLog.count({
        where: {
          timestamp: { gte: oneMinuteAgo },
          level: { in: [LogLevel.ERROR, LogLevel.FATAL] },
        },
      }),
      this.prisma.session.count({
        where: { isActive: true },
      }),
      this.prisma.$queryRaw<[{ avg: number | null }]>`
        SELECT AVG((metadata->>'duration')::numeric) as avg
        FROM "ApplicationLog"
        WHERE timestamp >= ${oneMinuteAgo}
          AND service = 'api'
          AND metadata->>'duration' IS NOT NULL
      `,
      this.prisma.emailLog.count({
        where: {
          createdAt: { gte: today },
          status: EmailStatus.SENT,
        },
      }),
      this.prisma.cronLog.count({
        where: { status: CronStatus.STARTED },
      }),
    ]);

    return {
      requestsLastMinute: requests,
      errorsLastMinute: errors,
      activeUsers,
      avgResponseTime: Math.round(avgResponse[0]?.avg || 0),
      emailsSentToday: emailsSent,
      cronJobsRunning: cronRunning,
    };
  }
}

