import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClsModule } from 'nestjs-cls';

// Entities
import { AuditLog } from './entity/audit-log.entity';

// Helpers
import { OtpHelper } from './helper/otp.helper';
import { LockHelper } from './helper/lock.helper';

// Validators
import { IsUniqueConstraint } from './validator/is-unique.validator';
import { IsExistsConstraint } from './validator/is-exists.validator';

// Submodules
import { StorageModule } from './module/storage/storage.module';
import { MailModule } from './module/mail/mail.module';

@Global()
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([AuditLog]),
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
      },
    }),
    StorageModule,
    MailModule,
  ],
  providers: [
    OtpHelper,
    LockHelper,
    IsUniqueConstraint,
    IsExistsConstraint,
  ],
  exports: [
    TypeOrmModule,
    OtpHelper,
    LockHelper,
    IsUniqueConstraint,
    IsExistsConstraint,
    StorageModule,
    MailModule,
  ],
})
export class SystemModule {}
