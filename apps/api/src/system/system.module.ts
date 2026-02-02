import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClsModule } from 'nestjs-cls';

import { PrismaModule } from '../prisma/prisma.module';

// Helpers
import { OtpHelper } from './helper/otp.helper';
import { LockHelper } from './helper/lock.helper';

// Guards
import { FamilyAccessGuard } from './guard/family-access.guard';
import { RolesGuard } from './guard/roles.guard';

// Validators
import { IsUniqueConstraint } from './validator/is-unique.validator';
import { IsExistsConstraint } from './validator/is-exists.validator';

// Submodules
import { StorageModule } from './module/storage/storage.module';
import { MailModule } from './module/mail/mail.module';
import { CacheModule } from './module/cache';
import { LimitsModule } from './module/limits';
import { LoggingModule } from './module/logging';

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
    LimitsModule,
    LoggingModule,
    StorageModule,
    MailModule,
  ],
  providers: [
    OtpHelper,
    LockHelper,
    IsUniqueConstraint,
    IsExistsConstraint,
    FamilyAccessGuard,
    RolesGuard,
  ],
  exports: [
    PrismaModule,
    CacheModule,
    LimitsModule,
    LoggingModule,
    OtpHelper,
    LockHelper,
    IsUniqueConstraint,
    IsExistsConstraint,
    StorageModule,
    MailModule,
    FamilyAccessGuard,
    RolesGuard,
  ],
})
export class SystemModule {}
