import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../system/guard/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { AdminEmailLogService } from '../services/admin-email-log.service';
import { AdminAuthLogService } from '../services/admin-auth-log.service';
import { AdminCronLogService } from '../services/admin-cron-log.service';
import { AdminTimeSeriesService } from '../services/admin-timeseries.service';
import { EmailStatus, AuthEvent, CronStatus } from '@prisma/client';

@ApiTags('Admin - Monitoring')
@ApiBearerAuth('JWT-auth')
@Controller('admin/monitoring')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminMonitoringController {
  constructor(
    private readonly emailLogService: AdminEmailLogService,
    private readonly authLogService: AdminAuthLogService,
    private readonly cronLogService: AdminCronLogService,
    private readonly timeSeriesService: AdminTimeSeriesService,
  ) {}

  // ==================== TIME SERIES ====================

  @Get('requests/timeseries')
  @ApiOperation({ summary: 'Get request count time series for charts' })
  @ApiQuery({ name: 'hours', required: false, type: Number, description: 'Time window in hours (default: 24)' })
  @ApiResponse({ status: 200, description: 'Request time series data' })
  async getRequestTimeSeries(@Query('hours') hours?: string) {
    const hoursNum = this.validateHours(hours);
    return this.timeSeriesService.getRequestTimeSeries(hoursNum);
  }

  @Get('errors/timeseries')
  @ApiOperation({ summary: 'Get error count time series for charts' })
  @ApiQuery({ name: 'hours', required: false, type: Number, description: 'Time window in hours (default: 24)' })
  @ApiResponse({ status: 200, description: 'Error time series data' })
  async getErrorTimeSeries(@Query('hours') hours?: string) {
    const hoursNum = this.validateHours(hours);
    return this.timeSeriesService.getErrorTimeSeries(hoursNum);
  }

  @Get('response-times')
  @ApiOperation({ summary: 'Get response time statistics and time series' })
  @ApiQuery({ name: 'hours', required: false, type: Number, description: 'Time window in hours (default: 24)' })
  @ApiResponse({ status: 200, description: 'Response time statistics' })
  async getResponseTimeStats(@Query('hours') hours?: string) {
    const hoursNum = this.validateHours(hours);
    return this.timeSeriesService.getResponseTimeStats(hoursNum);
  }

  // ==================== EMAIL LOGS ====================

  @Get('emails')
  @ApiOperation({ summary: 'Get email logs with filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: EmailStatus })
  @ApiQuery({ name: 'provider', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Email logs retrieved successfully' })
  async getEmailLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: EmailStatus,
    @Query('provider') provider?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.emailLogService.getLogs(
      {
        status,
        provider,
        search,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      parseInt(page || '1', 10),
      Math.min(parseInt(limit || '50', 10), 100),
    );
  }

  @Get('emails/stats')
  @ApiOperation({ summary: 'Get email statistics' })
  @ApiQuery({ name: 'hours', required: false, type: Number, description: 'Time window in hours (default: 24)' })
  @ApiResponse({ status: 200, description: 'Email statistics' })
  async getEmailStats(@Query('hours') hours?: string) {
    const hoursNum = this.validateHours(hours);
    return this.emailLogService.getStats(hoursNum);
  }

  @Get('emails/timeseries')
  @ApiOperation({ summary: 'Get email send time series for charts' })
  @ApiQuery({ name: 'hours', required: false, type: Number, description: 'Time window in hours (default: 24)' })
  @ApiResponse({ status: 200, description: 'Email time series data' })
  async getEmailTimeSeries(@Query('hours') hours?: string) {
    const hoursNum = this.validateHours(hours);
    return this.timeSeriesService.getEmailTimeSeries(hoursNum);
  }

  @Get('emails/recent')
  @ApiOperation({ summary: 'Get recent email logs' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of logs to return (default: 10)' })
  @ApiResponse({ status: 200, description: 'Recent email logs' })
  async getRecentEmails(@Query('limit') limit?: string) {
    const limitNum = Math.min(parseInt(limit || '10', 10), 50);
    return this.emailLogService.getRecent(limitNum);
  }

  // ==================== AUTH LOGS ====================

  @Get('auth')
  @ApiOperation({ summary: 'Get auth logs with filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'event', required: false, enum: AuthEvent })
  @ApiQuery({ name: 'email', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Auth logs retrieved successfully' })
  async getAuthLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('event') event?: AuthEvent,
    @Query('email') email?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.authLogService.getLogs(
      {
        event,
        email,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      parseInt(page || '1', 10),
      Math.min(parseInt(limit || '50', 10), 100),
    );
  }

  @Get('auth/stats')
  @ApiOperation({ summary: 'Get auth statistics' })
  @ApiQuery({ name: 'hours', required: false, type: Number, description: 'Time window in hours (default: 24)' })
  @ApiResponse({ status: 200, description: 'Auth statistics' })
  async getAuthStats(@Query('hours') hours?: string) {
    const hoursNum = this.validateHours(hours);
    return this.authLogService.getStats(hoursNum);
  }

  @Get('auth/timeseries')
  @ApiOperation({ summary: 'Get auth events time series for charts' })
  @ApiQuery({ name: 'hours', required: false, type: Number, description: 'Time window in hours (default: 24)' })
  @ApiResponse({ status: 200, description: 'Auth time series data' })
  async getAuthTimeSeries(@Query('hours') hours?: string) {
    const hoursNum = this.validateHours(hours);
    return this.timeSeriesService.getAuthTimeSeries(hoursNum);
  }

  @Get('auth/recent')
  @ApiOperation({ summary: 'Get recent auth logs' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of logs to return (default: 10)' })
  @ApiResponse({ status: 200, description: 'Recent auth logs' })
  async getRecentAuth(@Query('limit') limit?: string) {
    const limitNum = Math.min(parseInt(limit || '10', 10), 50);
    return this.authLogService.getRecent(limitNum);
  }

  // ==================== CRON LOGS ====================

  @Get('cron')
  @ApiOperation({ summary: 'Get cron job logs with filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'jobName', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: CronStatus })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Cron logs retrieved successfully' })
  async getCronLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('jobName') jobName?: string,
    @Query('status') status?: CronStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.cronLogService.getLogs(
      {
        jobName,
        status,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      parseInt(page || '1', 10),
      Math.min(parseInt(limit || '50', 10), 100),
    );
  }

  @Get('cron/stats')
  @ApiOperation({ summary: 'Get cron job statistics' })
  @ApiQuery({ name: 'hours', required: false, type: Number, description: 'Time window in hours (default: 24)' })
  @ApiResponse({ status: 200, description: 'Cron statistics' })
  async getCronStats(@Query('hours') hours?: string) {
    const hoursNum = this.validateHours(hours);
    return this.cronLogService.getStats(hoursNum);
  }

  @Get('cron/timeseries')
  @ApiOperation({ summary: 'Get cron job execution time series for charts' })
  @ApiQuery({ name: 'hours', required: false, type: Number, description: 'Time window in hours (default: 24)' })
  @ApiResponse({ status: 200, description: 'Cron time series data' })
  async getCronTimeSeries(@Query('hours') hours?: string) {
    const hoursNum = this.validateHours(hours);
    return this.timeSeriesService.getCronTimeSeries(hoursNum);
  }

  @Get('cron/recent')
  @ApiOperation({ summary: 'Get recent cron job logs' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of logs to return (default: 10)' })
  @ApiResponse({ status: 200, description: 'Recent cron logs' })
  async getRecentCron(@Query('limit') limit?: string) {
    const limitNum = Math.min(parseInt(limit || '10', 10), 50);
    return this.cronLogService.getRecent(limitNum);
  }

  @Get('cron/jobs')
  @ApiOperation({ summary: 'Get list of cron job names' })
  @ApiResponse({ status: 200, description: 'List of job names' })
  async getCronJobNames() {
    const jobNames = await this.cronLogService.getJobNames();
    return { jobNames };
  }

  // ==================== REALTIME ====================

  @Get('realtime')
  @ApiOperation({ summary: 'Get real-time monitoring stats' })
  @ApiResponse({ status: 200, description: 'Real-time statistics' })
  async getRealtimeStats() {
    return this.timeSeriesService.getRealtimeStats();
  }

  // ==================== DASHBOARD ====================

  @Get('dashboard')
  @ApiOperation({ summary: 'Get complete monitoring dashboard data' })
  @ApiQuery({ name: 'hours', required: false, type: Number, description: 'Time window in hours (default: 24)' })
  @ApiResponse({ status: 200, description: 'Complete dashboard data' })
  async getDashboard(@Query('hours') hours?: string) {
    const hoursNum = this.validateHours(hours);

    const [
      requestTimeSeries,
      errorTimeSeries,
      responseTimeStats,
      emailStats,
      authStats,
      cronStats,
      realtimeStats,
    ] = await Promise.all([
      this.timeSeriesService.getRequestTimeSeries(hoursNum),
      this.timeSeriesService.getErrorTimeSeries(hoursNum),
      this.timeSeriesService.getResponseTimeStats(hoursNum),
      this.emailLogService.getStats(hoursNum),
      this.authLogService.getStats(hoursNum),
      this.cronLogService.getStats(hoursNum),
      this.timeSeriesService.getRealtimeStats(),
    ]);

    return {
      requests: requestTimeSeries,
      errors: errorTimeSeries,
      responseTimes: responseTimeStats,
      emails: emailStats,
      auth: authStats,
      cron: cronStats,
      realtime: realtimeStats,
      timestamp: new Date().toISOString(),
    };
  }

  // ==================== HELPERS ====================

  private validateHours(hours?: string): number {
    const hoursNum = parseInt(hours || '24', 10);
    if (hoursNum < 1 || hoursNum > 720) {
      throw new BadRequestException('Hours must be between 1 and 720');
    }
    return hoursNum;
  }
}

