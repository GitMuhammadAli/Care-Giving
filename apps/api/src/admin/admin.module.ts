import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';

// Guards
import { AdminGuard, SuperAdminGuard } from './guards';

// Services
import {
  AdminUsersService,
  AdminFamiliesService,
  AdminAnalyticsService,
  AdminAuditService,
} from './services';

// Controllers
import {
  AdminUsersController,
  AdminFamiliesController,
  AdminAnalyticsController,
  AdminAuditController,
  AdminSystemController,
  AdminLogsController,
} from './controllers';

@Module({
  imports: [PrismaModule],
  controllers: [
    AdminUsersController,
    AdminFamiliesController,
    AdminAnalyticsController,
    AdminAuditController,
    AdminSystemController,
    AdminLogsController,
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
  ],
  exports: [
    AdminGuard,
    SuperAdminGuard,
    AdminUsersService,
    AdminFamiliesService,
    AdminAnalyticsService,
    AdminAuditService,
  ],
})
export class AdminModule {}

