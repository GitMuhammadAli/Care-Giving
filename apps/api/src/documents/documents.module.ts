import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { DocumentsProcessor } from './documents.processor';
import { SystemModule } from '../system/system.module';
import { EventsModule } from '../events/events.module';

// Check if queues are enabled (for conditional module import)
const enableQueues = process.env.ENABLE_QUEUES !== 'false';

@Module({
  imports: [
    SystemModule,
    EventsModule,
    ConfigModule,
    // Only register the queue if ENABLE_QUEUES is not explicitly false
    ...(enableQueues
      ? [
          BullModule.registerQueue({
            name: 'document-upload',
          }),
        ]
      : []),
  ],
  controllers: [DocumentsController],
  // Only include the processor if queues are enabled
  providers: [DocumentsService, ...(enableQueues ? [DocumentsProcessor] : [])],
  exports: [DocumentsService],
})
export class DocumentsModule {}
