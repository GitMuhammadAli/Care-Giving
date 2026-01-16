import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import {
  I18nModule,
  AcceptLanguageResolver,
  QueryResolver,
  HeaderResolver,
} from 'nestjs-i18n';
import * as path from 'path';

import configs from './config';
import { PrismaModule } from './prisma/prisma.module';

// System
import { SystemModule } from './system/system.module';
import { JwtAuthGuard } from './system/guard/jwt-auth.guard';
import { IpGuard } from './system/guard/ip.guard';
import { LanguageGuard } from './system/guard/language.guard';
import { CustomThrottlerGuard } from './system/guard/throttle.guard';
import { LoggingInterceptor } from './system/interceptor/logging.interceptor';
import { GlobalExceptionFilter } from './system/filter/http-exception.filter';
import { ValidationExceptionFilter } from './system/filter/validation-exception.filter';

// Feature Modules
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { FamilyModule } from './family/family.module';
import { CareRecipientModule } from './care-recipient/care-recipient.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { MedicationsModule } from './medications/medications.module';
import { DocumentsModule } from './documents/documents.module';
import { EmergencyModule } from './emergency/emergency.module';
import { CaregiverShiftsModule } from './caregiver-shifts/caregiver-shifts.module';
import { TimelineModule } from './timeline/timeline.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ChatModule } from './chat/chat.module';
import { GatewayModule } from './gateway/gateway.module';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      load: configs,
      envFilePath: ['.env.local', '.env'],
    }),

    // Database - Prisma
    PrismaModule,

    // Event Emitter for real-time events
    EventEmitterModule.forRoot(),

    // Schedule Module for cron jobs
    ScheduleModule.forRoot(),

    // i18n
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(__dirname, '/i18n/'),
        watch: true,
      },
      resolvers: [
        new HeaderResolver(['x-language']),
        new QueryResolver(['lang']),
        AcceptLanguageResolver,
      ],
    }),

    // Throttler (Rate Limiting)
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Bull (Queues) - Uses centralized Redis config
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get('redis');
        const host = redisConfig?.host || 'localhost';
        const port = redisConfig?.port || 6379;
        const password = redisConfig?.password;
        const useTls = redisConfig?.tls === true;

        const redis: any = { host, port };

        // Only add password if set
        if (password && password.trim() !== '') {
          redis.password = password;
        }

        // Add TLS if configured
        if (useTls) {
          redis.tls = {};
        }

        return { redis };
      },
      inject: [ConfigService],
    }),

    // Core modules
    SystemModule,
    HealthModule,
    MetricsModule,
    AuthModule,
    UserModule,
    FamilyModule,
    CareRecipientModule,
    AppointmentsModule,
    MedicationsModule,
    DocumentsModule,
    EmergencyModule,
    CaregiverShiftsModule,
    TimelineModule,
    NotificationsModule,
    ChatModule,
    GatewayModule,
  ],
  providers: [
    // Global Guards
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: IpGuard,
    },
    {
      provide: APP_GUARD,
      useClass: LanguageGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global Interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // Global Filters
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: ValidationExceptionFilter,
    },
  ],
})
export class AppModule {}
