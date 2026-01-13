import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmergencyAlert } from './entity/emergency-alert.entity';
import { EmergencyAlertRepository } from './repository/emergency-alert.repository';
import { EmergencyService } from './service/emergency.service';
import { EmergencyController } from './emergency.controller';
import { FamilyMember } from '../family/entity/family-member.entity';
import { FamilyMemberRepository } from '../family/repository/family-member.repository';

@Module({
  imports: [TypeOrmModule.forFeature([EmergencyAlert, FamilyMember])],
  controllers: [EmergencyController],
  providers: [EmergencyService, EmergencyAlertRepository, FamilyMemberRepository],
  exports: [EmergencyService],
})
export class EmergencyModule {}
