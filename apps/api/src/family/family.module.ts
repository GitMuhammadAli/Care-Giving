import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Family } from './entity/family.entity';
import { FamilyMember } from './entity/family-member.entity';
import { FamilyInvitation } from './entity/family-invitation.entity';

import { FamilyRepository } from './repository/family.repository';
import { FamilyMemberRepository } from './repository/family-member.repository';
import { FamilyInvitationRepository } from './repository/family-invitation.repository';

import { FamilyService } from './service/family.service';
import { FamilyController } from './controller/family.controller';

import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Family, FamilyMember, FamilyInvitation]),
    UserModule,
  ],
  providers: [
    FamilyRepository,
    FamilyMemberRepository,
    FamilyInvitationRepository,
    FamilyService,
  ],
  controllers: [FamilyController],
  exports: [FamilyService, FamilyMemberRepository],
})
export class FamilyModule {}
