import { Module } from '@nestjs/common';
import { CareRecipientsService } from './care-recipients.service';
import { CareRecipientsController } from './care-recipients.controller';

@Module({
  providers: [CareRecipientsService],
  controllers: [CareRecipientsController],
  exports: [CareRecipientsService],
})
export class CareRecipientsModule {}

