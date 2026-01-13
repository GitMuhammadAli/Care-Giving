import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CareRecipient } from './entity/care-recipient.entity';
import { Doctor } from './entity/doctor.entity';
import { EmergencyContact } from './entity/emergency-contact.entity';
import { FamilyMember } from '../family/entity/family-member.entity';

import { CareRecipientRepository } from './repository/care-recipient.repository';
import { CareRecipientService } from './service/care-recipient.service';
import { CareRecipientController } from './controller/care-recipient.controller';

import { FamilyModule } from '../family/family.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CareRecipient, Doctor, EmergencyContact, FamilyMember]),
    FamilyModule,
  ],
  providers: [CareRecipientRepository, CareRecipientService],
  controllers: [CareRecipientController],
  exports: [CareRecipientService, CareRecipientRepository],
})
export class CareRecipientModule {}

