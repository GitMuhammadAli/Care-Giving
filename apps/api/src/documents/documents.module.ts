import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { DocumentsProcessor } from './documents.processor';
import { SystemModule } from '../system/system.module';

@Module({
  imports: [
    SystemModule,
    BullModule.registerQueue({
      name: 'document-upload',
    }),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentsProcessor],
  exports: [DocumentsService],
})
export class DocumentsModule {}
