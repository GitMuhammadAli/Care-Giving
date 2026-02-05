import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SystemModule } from '../system/system.module';

// Guards
import { AdminGuard, SuperAdminGuard } from './guards';

// Services
import {
  AdminUsersService,
  AdminFamiliesService,
  AdminAnalyticsService,
  AdminAuditService,
  AdminEmailLogService,
  AdminAuthLogService,
  AdminCronLogService,
  AdminTimeSeriesService,
} from './services';

// Controllers
import {
  AdminUsersController,
  AdminFamiliesController,
  AdminAnalyticsController,
  AdminAuditController,
  AdminSystemController,
  AdminLogsController,
  AdminMonitoringController,
} from './controllers';

@Module({
  imports: [PrismaModule, SystemModule],
  controllers: [
    AdminUsersController,
    AdminFamiliesController,
    AdminAnalyticsController,
    AdminAuditController,
    AdminSystemController,
    AdminLogsController,
    AdminMonitoringController,
  ],
  providers: [
    // Guards
    AdminGuard,
    SuperAdminGuard,
    // Services
    AdminUsersService,
    AdminFamiliesService,
    AdminAnalyticsService,
    AdminAuditService,
    AdminEmailLogService,
    AdminAuthLogService,
    AdminCronLogService,
    AdminTimeSeriesService,
  ],
  exports: [
    AdminGuard,
    SuperAdminGuard,
    AdminUsersService,
    AdminFamiliesService,
    AdminAnalyticsService,
    AdminAuditService,
    AdminEmailLogService,
    AdminAuthLogService,
    AdminCronLogService,
    AdminTimeSeriesService,
  ],
})
export class AdminModule {}

