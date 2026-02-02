import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminAnalyticsService } from '../services/admin-analytics.service';
import { JwtAuthGuard } from '../../system/guard/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';

@ApiTags('Admin - Analytics')
@ApiBearerAuth('JWT-auth')
@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminAnalyticsController {
  constructor(private adminAnalyticsService: AdminAnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get dashboard overview stats' })
  @ApiResponse({ status: 200, description: 'Overview statistics' })
  getOverview() {
    return this.adminAnalyticsService.getOverview();
  }

  @Get('users')
  @ApiOperation({ summary: 'Get user metrics and growth data' })
  @ApiResponse({ status: 200, description: 'User metrics' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to analyze (default: 30)' })
  getUserMetrics(@Query('days') days?: string) {
    return this.adminAnalyticsService.getUserMetrics(days ? parseInt(days, 10) : 30);
  }

  @Get('families')
  @ApiOperation({ summary: 'Get family metrics' })
  @ApiResponse({ status: 200, description: 'Family metrics' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to analyze (default: 30)' })
  getFamilyMetrics(@Query('days') days?: string) {
    return this.adminAnalyticsService.getFamilyMetrics(days ? parseInt(days, 10) : 30);
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get feature usage metrics' })
  @ApiResponse({ status: 200, description: 'Usage metrics' })
  getUsageMetrics() {
    return this.adminAnalyticsService.getUsageMetrics();
  }

  @Get('export')
  @ApiOperation({ summary: 'Export analytics data' })
  @ApiResponse({ status: 200, description: 'Exported data' })
  @ApiQuery({ name: 'type', enum: ['users', 'families', 'activity'], description: 'Data type to export' })
  @ApiQuery({ name: 'format', enum: ['json', 'csv'], required: false, description: 'Export format (default: json)' })
  async exportData(
    @Query('type') type: 'users' | 'families' | 'activity',
    @Query('format') format: 'json' | 'csv' = 'json',
    @Res() res: Response,
  ) {
    const data = await this.adminAnalyticsService.exportData(type, format);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-export-${Date.now()}.csv"`);
      return res.send(data);
    }

    return res.json(data);
  }
}

