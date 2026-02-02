import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../system/guard/jwt-auth.guard';
import { SuperAdminGuard } from '../guards/super-admin.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { LimitsService, RESOURCE_LIMITS } from '../../system/module/limits';

@ApiTags('Admin - System')
@ApiBearerAuth('JWT-auth')
@Controller('admin/system')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminSystemController {
  constructor(
    private prisma: PrismaService,
    private limitsService: LimitsService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Get detailed system health status' })
  @ApiResponse({ status: 200, description: 'System health information' })
  async getHealth() {
    const startTime = Date.now();

    // Test database connection
    let dbStatus = 'healthy';
    let dbLatency = 0;
    try {
      const dbStart = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStart;
    } catch {
      dbStatus = 'unhealthy';
    }

    // Get database stats
    const [userCount, familyCount, sessionCount] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.family.count(),
      this.prisma.session.count({ where: { isActive: true } }),
    ]);

    // Memory usage
    const memUsage = process.memoryUsage();

    return {
      status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbStatus,
        latency: `${dbLatency}ms`,
        stats: {
          users: userCount,
          families: familyCount,
          activeSessions: sessionCount,
        },
      },
      memory: {
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      },
      responseTime: `${Date.now() - startTime}ms`,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get system statistics' })
  @ApiResponse({ status: 200, description: 'System statistics' })
  async getStats() {
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalFamilies,
      totalCareRecipients,
      totalAppointments,
      totalMedications,
      totalDocuments,
      totalAuditLogs,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.family.count(),
      this.prisma.careRecipient.count(),
      this.prisma.appointment.count(),
      this.prisma.medication.count(),
      this.prisma.document.count(),
      this.prisma.auditLog.count(),
    ]);

    // Get role distribution
    const roleDistribution = await this.prisma.user.groupBy({
      by: ['systemRole'],
      _count: true,
    });

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        byRole: roleDistribution.reduce((acc, r) => {
          acc[r.systemRole] = r._count;
          return acc;
        }, {} as Record<string, number>),
      },
      families: {
        total: totalFamilies,
      },
      careRecipients: {
        total: totalCareRecipients,
      },
      content: {
        appointments: totalAppointments,
        medications: totalMedications,
        documents: totalDocuments,
      },
      audit: {
        totalLogs: totalAuditLogs,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get resource usage statistics for free-tier monitoring' })
  @ApiResponse({ status: 200, description: 'Resource usage statistics' })
  async getUsage() {
    const usageStats = await this.limitsService.getAllUsageStats();

    // Format usage data with provider info
    const formattedUsage = usageStats.map((stat) => ({
      resource: stat.resource,
      current: stat.count,
      limit: stat.limit,
      remaining: stat.remaining,
      percentUsed: stat.percentUsed,
      status: stat.isAtLimit ? 'LIMIT_REACHED' : stat.isWarning ? 'WARNING' : 'OK',
    }));

    return {
      usage: formattedUsage,
      limits: {
        emails: {
          daily: RESOURCE_LIMITS.EMAILS_PER_DAY.appLimit,
          providerLimit: RESOURCE_LIMITS.EMAILS_PER_DAY.providerLimit,
          provider: 'Brevo',
        },
        fileUploads: {
          monthly: RESOURCE_LIMITS.FILE_UPLOADS_PER_MONTH.appLimit,
          providerLimit: RESOURCE_LIMITS.FILE_UPLOADS_PER_MONTH.providerLimit,
          maxFileSizeMB: Math.round(RESOURCE_LIMITS.MAX_FILE_SIZE_BYTES.limit / (1024 * 1024)),
          provider: 'Cloudinary',
        },
        redisCommands: {
          daily: RESOURCE_LIMITS.REDIS_COMMANDS_PER_DAY.appLimit,
          providerLimit: RESOURCE_LIMITS.REDIS_COMMANDS_PER_DAY.providerLimit,
          provider: 'Upstash',
        },
        rabbitmqMessages: {
          monthly: RESOURCE_LIMITS.RABBITMQ_MESSAGES_PER_MONTH.appLimit,
          providerLimit: RESOURCE_LIMITS.RABBITMQ_MESSAGES_PER_MONTH.providerLimit,
          provider: 'CloudAMQP',
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('usage/summary')
  @ApiOperation({ summary: 'Get quick usage summary for dashboard' })
  @ApiResponse({ status: 200, description: 'Usage summary' })
  async getUsageSummary() {
    const usageStats = await this.limitsService.getAllUsageStats();

    // Calculate overall health
    const atLimit = usageStats.filter((s) => s.isAtLimit).length;
    const warnings = usageStats.filter((s) => s.isWarning && !s.isAtLimit).length;

    let overallStatus = 'HEALTHY';
    if (atLimit > 0) {
      overallStatus = 'CRITICAL';
    } else if (warnings > 0) {
      overallStatus = 'WARNING';
    }

    return {
      status: overallStatus,
      resourcesAtLimit: atLimit,
      resourcesWithWarnings: warnings,
      totalResources: usageStats.length,
      highestUsage: usageStats.reduce(
        (max, stat) => (stat.percentUsed > max.percentUsed ? stat : max),
        usageStats[0],
      ),
      timestamp: new Date().toISOString(),
    };
  }
}

