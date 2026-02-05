import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../system/module/cache/cache.service';

@Injectable()
export class AdminAnalyticsService {
  // Cache TTLs (in seconds)
  private readonly CACHE_TTL = {
    overview: 60,        // 1 minute - frequently accessed
    userMetrics: 300,    // 5 minutes
    familyMetrics: 300,  // 5 minutes
    usageMetrics: 300,   // 5 minutes
  };

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  async getOverview() {
    const cacheKey = 'admin:analytics:overview';
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchOverview(),
      this.CACHE_TTL.overview,
    );
  }

  private async fetchOverview() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      newUsersToday,
      newUsersWeek,
      newUsersMonth,
      totalFamilies,
      totalCareRecipients,
      activeMedications,
      upcomingAppointments,
      activeEmergencies,
      pendingInvitations,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
      this.prisma.family.count(),
      this.prisma.careRecipient.count(),
      this.prisma.medication.count({ where: { isActive: true } }),
      this.prisma.appointment.count({
        where: {
          startTime: { gte: now },
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
        },
      }),
      this.prisma.emergencyAlert.count({ where: { status: 'ACTIVE' } }),
      this.prisma.familyInvitation.count({ where: { status: 'PENDING' } }),
    ]);

    // Calculate growth rates
    const previousMonthUsers = await this.prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(monthAgo.getTime() - 30 * 24 * 60 * 60 * 1000),
          lt: monthAgo,
        },
      },
    });

    const userGrowthRate = previousMonthUsers > 0
      ? ((newUsersMonth - previousMonthUsers) / previousMonthUsers) * 100
      : 100;

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        newToday: newUsersToday,
        newThisWeek: newUsersWeek,
        newThisMonth: newUsersMonth,
        growthRate: Math.round(userGrowthRate * 10) / 10,
      },
      families: {
        total: totalFamilies,
        pendingInvitations,
      },
      careRecipients: {
        total: totalCareRecipients,
        activeMedications,
        upcomingAppointments,
        activeEmergencies,
      },
      timestamp: now.toISOString(),
    };
  }

  async getUserMetrics(days: number = 30) {
    const cacheKey = `admin:analytics:users:${days}`;
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchUserMetrics(days),
      this.CACHE_TTL.userMetrics,
    );
  }

  private async fetchUserMetrics(days: number) {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Get daily user registrations
    const dailySignups = await this.prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT DATE("createdAt") as date, COUNT(*) as count
      FROM "User"
      WHERE "createdAt" >= ${startDate}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    // Get user status distribution
    const statusDistribution = await this.prisma.user.groupBy({
      by: ['status'],
      _count: true,
    });

    // Get system role distribution
    const roleDistribution = await this.prisma.user.groupBy({
      by: ['systemRole'],
      _count: true,
    });

    // Get active users (logged in within 7 days)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const activeThisWeek = await this.prisma.user.count({
      where: { lastLoginAt: { gte: weekAgo } },
    });

    // Get users by email verification status
    const emailVerificationStats = await this.prisma.user.groupBy({
      by: ['emailVerified'],
      _count: true,
    });

    return {
      dailySignups: dailySignups.map((d) => ({
        date: d.date,
        count: Number(d.count),
      })),
      statusDistribution: statusDistribution.map((s) => ({
        status: s.status,
        count: s._count,
      })),
      roleDistribution: roleDistribution.map((r) => ({
        role: r.systemRole,
        count: r._count,
      })),
      engagement: {
        activeThisWeek,
        totalUsers: await this.prisma.user.count(),
      },
      emailVerification: emailVerificationStats.map((e) => ({
        verified: e.emailVerified,
        count: e._count,
      })),
    };
  }

  async getFamilyMetrics(days: number = 30) {
    const cacheKey = `admin:analytics:families:${days}`;
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchFamilyMetrics(days),
      this.CACHE_TTL.familyMetrics,
    );
  }

  private async fetchFamilyMetrics(days: number) {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Get daily family creations
    const dailyCreations = await this.prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT DATE("createdAt") as date, COUNT(*) as count
      FROM "Family"
      WHERE "createdAt" >= ${startDate}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    // Get family size distribution
    const familySizes = await this.prisma.family.findMany({
      select: {
        _count: {
          select: { members: true },
        },
      },
    });

    const sizeDistribution: Record<string, number> = {
      '1': 0,
      '2-3': 0,
      '4-5': 0,
      '6+': 0,
    };

    familySizes.forEach((f) => {
      const size = f._count.members;
      if (size === 1) sizeDistribution['1']++;
      else if (size <= 3) sizeDistribution['2-3']++;
      else if (size <= 5) sizeDistribution['4-5']++;
      else sizeDistribution['6+']++;
    });

    // Get care recipients per family
    const careRecipientStats = await this.prisma.family.findMany({
      select: {
        _count: {
          select: { careRecipients: true },
        },
      },
    });

    const avgCareRecipients = careRecipientStats.length > 0
      ? careRecipientStats.reduce((sum, f) => sum + f._count.careRecipients, 0) / careRecipientStats.length
      : 0;

    return {
      dailyCreations: dailyCreations.map((d) => ({
        date: d.date,
        count: Number(d.count),
      })),
      sizeDistribution: Object.entries(sizeDistribution).map(([size, count]) => ({
        size,
        count,
      })),
      averageCareRecipients: Math.round(avgCareRecipients * 10) / 10,
      totalFamilies: await this.prisma.family.count(),
    };
  }

  async getUsageMetrics() {
    const cacheKey = 'admin:analytics:usage';
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchUsageMetrics(),
      this.CACHE_TTL.usageMetrics,
    );
  }

  private async fetchUsageMetrics() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Feature usage stats
    const [
      timelineEntriesWeek,
      medicationLogsWeek,
      appointmentsCreatedWeek,
      documentsUploadedWeek,
      emergencyAlertsWeek,
      shiftsScheduledWeek,
    ] = await Promise.all([
      this.prisma.timelineEntry.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.medicationLog.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.appointment.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.document.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.emergencyAlert.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.caregiverShift.count({ where: { createdAt: { gte: weekAgo } } }),
    ]);

    // Medication adherence
    const medLogsMonth = await this.prisma.medicationLog.groupBy({
      by: ['status'],
      where: { createdAt: { gte: monthAgo } },
      _count: true,
    });

    const totalMedLogs = medLogsMonth.reduce((sum, m) => sum + m._count, 0);
    const givenLogs = medLogsMonth.find((m) => m.status === 'GIVEN')?._count || 0;
    const adherenceRate = totalMedLogs > 0 ? (givenLogs / totalMedLogs) * 100 : 0;

    return {
      weeklyActivity: {
        timelineEntries: timelineEntriesWeek,
        medicationLogs: medicationLogsWeek,
        appointments: appointmentsCreatedWeek,
        documents: documentsUploadedWeek,
        emergencyAlerts: emergencyAlertsWeek,
        shifts: shiftsScheduledWeek,
      },
      medicationAdherence: {
        rate: Math.round(adherenceRate * 10) / 10,
        breakdown: medLogsMonth.map((m) => ({
          status: m.status,
          count: m._count,
        })),
      },
    };
  }

  async exportData(type: 'users' | 'families' | 'activity', format: 'json' | 'csv' = 'json') {
    let data: any;

    switch (type) {
      case 'users':
        data = await this.prisma.user.findMany({
          select: {
            id: true,
            email: true,
            fullName: true,
            status: true,
            systemRole: true,
            emailVerified: true,
            createdAt: true,
            lastLoginAt: true,
            _count: {
              select: { familyMemberships: true },
            },
          },
        });
        break;

      case 'families':
        data = await this.prisma.family.findMany({
          select: {
            id: true,
            name: true,
            createdAt: true,
            _count: {
              select: {
                members: true,
                careRecipients: true,
              },
            },
          },
        });
        break;

      case 'activity':
        data = await this.getUsageMetrics();
        break;
    }

    if (format === 'csv' && Array.isArray(data)) {
      return this.convertToCSV(data);
    }

    return data;
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
      return Object.keys(obj).reduce((acc: Record<string, any>, key) => {
        const newKey = prefix ? `${prefix}_${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key]) && !(obj[key] instanceof Date)) {
          Object.assign(acc, flattenObject(obj[key], newKey));
        } else {
          acc[newKey] = obj[key];
        }
        return acc;
      }, {});
    };

    const flatData = data.map((item) => flattenObject(item));
    const headers = Object.keys(flatData[0]);
    const rows = flatData.map((item) =>
      headers.map((header) => {
        const value = item[header];
        if (value === null || value === undefined) return '';
        if (value instanceof Date) return value.toISOString();
        if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
        return String(value);
      }).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }
}

