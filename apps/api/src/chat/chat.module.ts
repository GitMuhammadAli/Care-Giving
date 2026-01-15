import { Module } from '@nestjs/common';
import { ChatService } from './service/chat.service';
import { ChatController } from './controller/chat.controller';

@Module({
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
