import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CaregiverShift } from './entity/caregiver-shift.entity';
import { CaregiverShiftRepository } from './repository/caregiver-shift.repository';
import { CaregiverShiftsService } from './service/caregiver-shifts.service';
import { CaregiverShiftsController, MyShiftsController } from './caregiver-shifts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CaregiverShift])],
  controllers: [CaregiverShiftsController, MyShiftsController],
  providers: [CaregiverShiftsService, CaregiverShiftRepository],
  exports: [CaregiverShiftsService],
})
export class CaregiverShiftsModule {}
