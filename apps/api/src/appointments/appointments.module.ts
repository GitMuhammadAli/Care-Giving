import { Module, forwardRef } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController, CareRecipientAppointmentsController, RecurringAppointmentsController } from './appointments.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [forwardRef(() => NotificationsModule), AiModule],
  controllers: [CareRecipientAppointmentsController, AppointmentsController, RecurringAppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
