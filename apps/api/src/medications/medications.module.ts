import { Module, forwardRef } from '@nestjs/common';
import { MedicationsService } from './medications.service';
import { MedicationsController, MedicationLogsController } from './medications.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [forwardRef(() => NotificationsModule)],
  controllers: [MedicationsController, MedicationLogsController],
  providers: [MedicationsService],
  exports: [MedicationsService],
})
export class MedicationsModule {}
