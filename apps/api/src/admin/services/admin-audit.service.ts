import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface AuditLogFilter {
  userId?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AdminAuditService {
  constructor(private prisma: PrismaService) {}

  async getLogs(filter: AuditLogFilter) {
    const {
      userId,
      action,
      resource,
      resourceId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = filter;

    const where: Prisma.AuditLogWhereInput = {};

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = { contains: action, mode: 'insensitive' };
    }

    if (resource) {
      where.resource = resource;
    }

    if (resourceId) {
      where.resourceId = resourceId;
    }

    if (startDate) {
      where.timestamp = { ...(where.timestamp as any), gte: new Date(startDate) };
    }

    if (endDate) {
      where.timestamp = { ...(where.timestamp as any), lte: new Date(endDate) };
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    // Enrich logs with user info
    const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))] as string[];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, fullName: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const enrichedLogs = logs.map((log) => ({
      ...log,
      user: log.userId ? userMap.get(log.userId) : null,
    }));

    return {
      data: enrichedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserAuditTrail(userId: string) {
    const logs = await this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    return logs;
  }

  async getSecurityEvents() {
    // Get security-related events
    const securityActions = [
      'LOGIN',
      'LOGOUT',
      'LOGOUT_ALL',
      'PASSWORD_RESET',
      'PASSWORD_CHANGE',
      'SUSPEND_USER',
      'ACTIVATE_USER',
      'DELETE_USER',
      'BULK_SUSPEND',
      'BULK_DELETE',
    ];

    const logs = await this.prisma.auditLog.findMany({
      where: {
        action: { in: securityActions },
      },
      orderBy: { timestamp: 'desc' },
      take: 200,
    });

    // Enrich with user info
    const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))] as string[];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, fullName: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return logs.map((log) => ({
      ...log,
      user: log.userId ? userMap.get(log.userId) : null,
    }));
  }

  async getLoginAttempts(days: number = 7) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const loginLogs = await this.prisma.auditLog.findMany({
      where: {
        action: { in: ['LOGIN', 'LOGIN_FAILED'] },
        timestamp: { gte: startDate },
      },
      orderBy: { timestamp: 'desc' },
    });

    // Group by success/failure
    const successful = loginLogs.filter((l) => l.action === 'LOGIN').length;
    const failed = loginLogs.filter((l) => l.action === 'LOGIN_FAILED').length;

    // Get failed login IPs
    const failedByIp: Record<string, number> = {};
    loginLogs
      .filter((l) => l.action === 'LOGIN_FAILED' && l.ipAddress)
      .forEach((l) => {
        failedByIp[l.ipAddress!] = (failedByIp[l.ipAddress!] || 0) + 1;
      });

    // Sort by count and get top suspicious IPs
    const suspiciousIps = Object.entries(failedByIp)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, failedAttempts: count }));

    return {
      summary: {
        successful,
        failed,
        total: successful + failed,
        failureRate: successful + failed > 0 ? (failed / (successful + failed)) * 100 : 0,
      },
      suspiciousIps,
      recentLogs: loginLogs.slice(0, 50),
    };
  }

  async getAdminActions() {
    // Get all admin-specific actions
    const adminActions = await this.prisma.auditLog.findMany({
      where: {
        action: {
          startsWith: '', // All actions
        },
        // Filter to only admin actions (those with certain prefixes)
        OR: [
          { action: { startsWith: 'CREATE_' } },
          { action: { startsWith: 'UPDATE_' } },
          { action: { startsWith: 'DELETE_' } },
          { action: { startsWith: 'SUSPEND_' } },
          { action: { startsWith: 'ACTIVATE_' } },
          { action: { startsWith: 'RESET_' } },
          { action: { startsWith: 'BULK_' } },
          { action: { startsWith: 'TRANSFER_' } },
        ],
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    // Enrich with admin user info
    const adminIds = [...new Set(adminActions.map((a) => a.userId).filter(Boolean))] as string[];
    const admins = await this.prisma.user.findMany({
      where: { id: { in: adminIds } },
      select: { id: true, email: true, fullName: true, systemRole: true },
    });
    const adminMap = new Map(admins.map((a) => [a.id, a]));

    return adminActions.map((action) => ({
      ...action,
      admin: action.userId ? adminMap.get(action.userId) : null,
    }));
  }

  async exportLogs(filter: AuditLogFilter, format: 'json' | 'csv' = 'json') {
    const { data } = await this.getLogs({ ...filter, limit: 10000 });

    if (format === 'csv') {
      return this.convertToCSV(data);
    }

    return data;
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = ['id', 'timestamp', 'userId', 'userEmail', 'action', 'resource', 'resourceId', 'ipAddress', 'userAgent'];
    const rows = data.map((log) => [
      log.id,
      log.timestamp?.toISOString() || '',
      log.userId || '',
      log.user?.email || '',
      log.action,
      log.resource || '',
      log.resourceId || '',
      log.ipAddress || '',
      log.userAgent || '',
    ].map((v) => {
      if (typeof v === 'string' && v.includes(',')) return `"${v}"`;
      return v;
    }).join(','));

    return [headers.join(','), ...rows].join('\n');
  }
}

