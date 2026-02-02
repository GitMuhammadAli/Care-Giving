import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminAuditService, AuditLogFilter } from '../services/admin-audit.service';
import { JwtAuthGuard } from '../../system/guard/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { SuperAdminGuard } from '../guards/super-admin.guard';

@ApiTags('Admin - Audit')
@ApiBearerAuth('JWT-auth')
@Controller('admin/audit')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminAuditController {
  constructor(private adminAuditService: AdminAuditService) {}

  @Get('logs')
  @ApiOperation({ summary: 'Get audit logs (paginated, filterable)' })
  @ApiResponse({ status: 200, description: 'Audit logs' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'resource', required: false })
  @ApiQuery({ name: 'resourceId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getLogs(@Query() filter: AuditLogFilter) {
    return this.adminAuditService.getLogs(filter);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get audit trail for specific user' })
  @ApiResponse({ status: 200, description: 'User audit trail' })
  getUserAuditTrail(@Param('userId') userId: string) {
    return this.adminAuditService.getUserAuditTrail(userId);
  }

  @Get('security-events')
  @ApiOperation({ summary: 'Get security-related events' })
  @ApiResponse({ status: 200, description: 'Security events' })
  getSecurityEvents() {
    return this.adminAuditService.getSecurityEvents();
  }

  @Get('login-attempts')
  @ApiOperation({ summary: 'Get login attempt statistics' })
  @ApiResponse({ status: 200, description: 'Login attempt stats' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to analyze (default: 7)' })
  getLoginAttempts(@Query('days') days?: string) {
    return this.adminAuditService.getLoginAttempts(days ? parseInt(days, 10) : 7);
  }

  @Get('admin-actions')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Get admin action history (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Admin actions' })
  getAdminActions() {
    return this.adminAuditService.getAdminActions();
  }

  @Get('export')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Export audit logs (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Exported audit logs' })
  @ApiQuery({ name: 'format', enum: ['json', 'csv'], required: false })
  async exportLogs(
    @Query() filter: AuditLogFilter,
    @Query('format') format: 'json' | 'csv' = 'json',
    @Res() res: Response,
  ) {
    const data = await this.adminAuditService.exportLogs(filter, format);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
      return res.send(data);
    }

    return res.json(data);
  }
}

