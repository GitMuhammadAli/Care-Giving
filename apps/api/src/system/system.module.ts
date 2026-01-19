import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClsModule } from 'nestjs-cls';

import { PrismaModule } from '../prisma/prisma.module';

// Helpers
import { OtpHelper } from './helper/otp.helper';
import { LockHelper } from './helper/lock.helper';

// Validators
import { IsUniqueConstraint } from './validator/is-unique.validator';
import { IsExistsConstraint } from './validator/is-exists.validator';

// Submodules
import { StorageModule } from './module/storage/storage.module';
import { MailModule } from './module/mail/mail.module';
import { CacheModule } from './module/cache';

@Global()
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
      },
    }),
    CacheModule,
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
    PrismaModule,
    CacheModule,
    OtpHelper,
    LockHelper,
    IsUniqueConstraint,
    IsExistsConstraint,
    StorageModule,
    MailModule,
  ],
})
export class SystemModule {}
