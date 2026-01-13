import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Notification } from './entity/notification.entity';
import { PushSubscription } from './entity/push-subscription.entity';
import { NotificationRepository } from './repository/notification.repository';
import { PushSubscriptionRepository } from './repository/push-subscription.repository';
import { NotificationsService } from './service/notifications.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, PushSubscription]),
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationRepository,
    PushSubscriptionRepository,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
