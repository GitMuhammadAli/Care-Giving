import { Module } from '@nestjs/common';
import { CareCircleGateway } from './carecircle.gateway';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [CareCircleGateway],
  exports: [CareCircleGateway],
})
export class GatewayModule {}
