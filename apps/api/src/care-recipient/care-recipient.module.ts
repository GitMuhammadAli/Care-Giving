import { Module } from '@nestjs/common';
import { CareRecipientService } from './care-recipient.service';
import { CareRecipientController } from './care-recipient.controller';

@Module({
  controllers: [CareRecipientController],
  providers: [CareRecipientService],
  exports: [CareRecipientService],
})
export class CareRecipientModule {}
