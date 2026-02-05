import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { GatewayModule } from '../gateway/gateway.module';
import { WebPushService } from './web-push.service';
import { ReminderSchedulerService } from './reminder-scheduler.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SystemModule } from '../system/system.module';

@Module({
  imports: [
    PrismaModule,
    SystemModule, // For LockHelper (distributed locking)
    BullModule.registerQueue({
      name: 'notifications',
    }),
    forwardRef(() => GatewayModule),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, WebPushService, ReminderSchedulerService],
  exports: [NotificationsService, WebPushService],
})
export class NotificationsModule {}
