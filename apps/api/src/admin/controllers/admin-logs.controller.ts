import {
  Controller,
  Get,
  Delete,
  Query,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../system/guard/jwt-auth.guard';
import { SuperAdminGuard } from '../guards/super-admin.guard';
import { AdminGuard } from '../guards/admin.guard';
import { LoggingService, LogFilter } from '../../system/module/logging';
import { LogLevel } from '@prisma/client';

@ApiTags('Admin - Logs')
@ApiBearerAuth('JWT-auth')
@Controller('admin/logs')
export class AdminLogsController {
  constructor(private readonly loggingService: LoggingService) {}

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Get application logs with filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'level', required: false, enum: LogLevel })
  @ApiQuery({ name: 'service', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'requestId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Logs retrieved successfully' })
  async getLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('level') level?: LogLevel,
    @Query('service') service?: string,
    @Query('userId') userId?: string,
    @Query('requestId') requestId?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filter: LogFilter = {};

    if (level) filter.level = level;
    if (service) filter.service = service;
    if (userId) filter.userId = userId;
    if (requestId) filter.requestId = requestId;
    if (search) filter.search = search;
    if (startDate) filter.startDate = new Date(startDate);
    if (endDate) filter.endDate = new Date(endDate);

    return this.loggingService.getLogs(
      filter,
      parseInt(page || '1', 10),
      Math.min(parseInt(limit || '50', 10), 100), // Max 100 per page
    );
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Get log statistics for dashboard' })
  @ApiQuery({ name: 'hours', required: false, type: Number, description: 'Time window in hours (default: 24)' })
  @ApiResponse({ status: 200, description: 'Log statistics' })
  async getStats(@Query('hours') hours?: string) {
    const hoursNum = parseInt(hours || '24', 10);
    if (hoursNum < 1 || hoursNum > 720) {
      throw new BadRequestException('Hours must be between 1 and 720');
    }
    return this.loggingService.getStats(hoursNum);
  }

  @Get('errors')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Get recent errors for quick view' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of errors to return (default: 10)' })
  @ApiResponse({ status: 200, description: 'Recent errors' })
  async getRecentErrors(@Query('limit') limit?: string) {
    const limitNum = Math.min(parseInt(limit || '10', 10), 50);
    return this.loggingService.getRecentErrors(limitNum);
  }

  @Get('services')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Get list of services with log counts' })
  @ApiResponse({ status: 200, description: 'Services list' })
  async getServices() {
    const stats = await this.loggingService.getStats(24 * 7); // Last 7 days
    return {
      services: Object.entries(stats.byService).map(([name, count]) => ({ name, count })),
    };
  }

  @Get('levels')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Get available log levels' })
  @ApiResponse({ status: 200, description: 'Log levels' })
  getLogLevels() {
    return {
      levels: Object.values(LogLevel),
    };
  }

  @Delete('cleanup')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiOperation({ summary: 'Clean up old logs (Super Admin only)' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Days to keep (default: 30)' })
  @ApiResponse({ status: 200, description: 'Cleanup completed' })
  async cleanupLogs(@Query('days') days?: string) {
    const daysNum = parseInt(days || '30', 10);
    if (daysNum < 1 || daysNum > 365) {
      throw new BadRequestException('Days must be between 1 and 365');
    }

    const deleted = await this.loggingService.cleanupOldLogs(daysNum);
    return {
      message: `Deleted ${deleted} logs older than ${daysNum} days`,
      deletedCount: deleted,
    };
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Get complete dashboard data for logs' })
  @ApiResponse({ status: 200, description: 'Dashboard data' })
  async getDashboard() {
    const [stats24h, stats7d, recentErrors] = await Promise.all([
      this.loggingService.getStats(24),
      this.loggingService.getStats(24 * 7),
      this.loggingService.getRecentErrors(5),
    ]);

    return {
      summary: {
        last24Hours: stats24h,
        last7Days: stats7d,
      },
      recentErrors,
      levels: Object.values(LogLevel),
      timestamp: new Date().toISOString(),
    };
  }
}

