import { Module } from '@nestjs/common';
import { CareRecipientService } from './care-recipient.service';

@Module({
  providers: [CareRecipientService],
  exports: [CareRecipientService],
})
export class CareRecipientModule {}
