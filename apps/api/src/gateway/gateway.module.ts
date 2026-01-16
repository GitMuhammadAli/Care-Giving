import { Module, forwardRef } from '@nestjs/common';
import { CareCircleGateway } from './carecircle.gateway';
import { EventsGateway } from './events.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule)],
  providers: [CareCircleGateway, EventsGateway],
  exports: [CareCircleGateway, EventsGateway],
})
export class GatewayModule {}
