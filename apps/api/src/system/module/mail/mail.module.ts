import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailService } from './mail.service';
import { LimitsModule } from '../limits';

@Global()
@Module({
  imports: [ConfigModule, LimitsModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
