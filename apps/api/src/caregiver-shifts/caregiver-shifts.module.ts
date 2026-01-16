import { Module, forwardRef } from '@nestjs/common';
import { CaregiverShiftsService } from './caregiver-shifts.service';
import { CaregiverShiftsController, MyShiftsController } from './caregiver-shifts.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [forwardRef(() => NotificationsModule)],
  controllers: [CaregiverShiftsController, MyShiftsController],
  providers: [CaregiverShiftsService],
  exports: [CaregiverShiftsService],
})
export class CaregiverShiftsModule {}
