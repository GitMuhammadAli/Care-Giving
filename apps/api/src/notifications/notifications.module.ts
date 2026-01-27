import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { GatewayModule } from '../gateway/gateway.module';
import { WebPushService } from './web-push.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notifications',
    }),
    forwardRef(() => GatewayModule),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, WebPushService],
  exports: [NotificationsService, WebPushService],
})
export class NotificationsModule {}
