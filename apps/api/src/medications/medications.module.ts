import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Medication } from './entity/medication.entity';
import { MedicationLog } from './entity/medication-log.entity';
import { MedicationRepository } from './repository/medication.repository';
import { MedicationLogRepository } from './repository/medication-log.repository';
import { MedicationsService } from './service/medications.service';
import { MedicationsController, MedicationLogsController } from './medications.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Medication, MedicationLog]),
    NotificationsModule,
  ],
  controllers: [MedicationsController, MedicationLogsController],
  providers: [MedicationsService, MedicationRepository, MedicationLogRepository],
  exports: [MedicationsService],
})
export class MedicationsModule {}
