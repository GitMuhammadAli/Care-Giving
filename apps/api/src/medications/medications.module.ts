import { Module, forwardRef } from '@nestjs/common';
import { MedicationsService } from './medications.service';
import { MedicationInteractionsService } from './medication-interactions.service';
import { 
  MedicationsController, 
  MedicationLogsController,
  MedicationInteractionsController,
  GlobalInteractionsController,
} from './medications.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [forwardRef(() => NotificationsModule)],
  controllers: [
    MedicationsController, 
    MedicationLogsController,
    MedicationInteractionsController,
    GlobalInteractionsController,
  ],
  providers: [MedicationsService, MedicationInteractionsService],
  exports: [MedicationsService, MedicationInteractionsService],
})
export class MedicationsModule {}
