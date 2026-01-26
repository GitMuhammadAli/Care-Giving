import { Module } from '@nestjs/common';
import { ChatService } from './service/chat.service';
import { ChatController } from './controller/chat.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { FamilyAccessGuard } from '../system/guard/family-access.guard';

@Module({
  imports: [PrismaModule],
  controllers: [ChatController],
  providers: [ChatService, FamilyAccessGuard],
  exports: [ChatService],
})
export class ChatModule {}
