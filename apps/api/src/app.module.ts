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
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { SentryExceptionFilter } from './common/filters/sentry-exception.filter';

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
import { EventsModule } from './events/events.module';
import { AdminModule } from './admin/admin.module';

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

    // Throttler (Rate Limiting) - Optimized to reduce backend load on free-tier
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 5, // Increased from 3 (less restrictive)
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 30, // Increased from 20
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 150, // Increased from 100
      },
    ]),

    // Bull (Queues) - Optimized for free-tier Redis (Upstash: 10K commands/day)
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get('redis');
        const host = redisConfig?.host || 'localhost';
        const port = redisConfig?.port || 6379;
        const password = redisConfig?.password;
        const useTls = redisConfig?.tls === true;

        const redis: any = {
          host,
          port,
          maxRetriesPerRequest: null, // Required for BullMQ
          enableReadyCheck: false, // Faster startup, saves Redis commands
          connectTimeout: 20000, // 20 second connect timeout for cloud
          keepAlive: 60000, // Reduced: keepalive every 60 seconds (saves commands)
          lazyConnect: true, // Only connect when needed (saves connections)
          retryStrategy: (times: number) => Math.min(times * 2000, 60000), // Slower retries
        };

        // Only add password if set
        if (password && password.trim() !== '') {
          redis.password = password;
        }

        // Add TLS if configured
        if (useTls) {
          redis.tls = {};
        }

        return {
          redis,
          // Free-tier optimization: reduce polling frequency
          defaultJobOptions: {
            attempts: 2, // Reduced from default 3
            backoff: {
              type: 'exponential',
              delay: 5000, // 5 seconds between retries
            },
            removeOnComplete: 100, // Keep only last 100 completed jobs
            removeOnFail: 50, // Keep only last 50 failed jobs
          },
          settings: {
            stalledInterval: 60000, // Check for stalled jobs every 60s (default: 30s)
            maxStalledCount: 2, // Reduced retries for stalled jobs
          },
        };
      },
      inject: [ConfigService],
    }),

    // Core modules
    SystemModule,
    EventsModule,
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
    // Admin Dashboard
    AdminModule,
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
    // Global Filters (order matters - most specific first, they run in reverse)
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: ValidationExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: PrismaExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: SentryExceptionFilter,
    },
  ],
})
export class AppModule {}
