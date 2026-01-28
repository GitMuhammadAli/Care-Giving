import { Module, forwardRef } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController, CareRecipientAppointmentsController, RecurringAppointmentsController } from './appointments.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [forwardRef(() => NotificationsModule)],
  controllers: [CareRecipientAppointmentsController, AppointmentsController, RecurringAppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
