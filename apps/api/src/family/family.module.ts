import { Module } from '@nestjs/common';
import { FamilyService } from './family.service';
import { FamilyController } from './family.controller';
import { SystemModule } from '../system/system.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [SystemModule, ChatModule],
  providers: [FamilyService],
  controllers: [FamilyController],
  exports: [FamilyService],
})
export class FamilyModule {}
