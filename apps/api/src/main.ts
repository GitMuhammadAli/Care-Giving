import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nValidationPipe, I18nValidationExceptionFilter } from 'nestjs-i18n';
import { ClsService } from 'nestjs-cls';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { setupSwagger } from './swagger';
import { ContextHelper } from './system/helper/context.helper';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const clsService = app.get(ClsService);
  ContextHelper.setClsService(clsService);

  const port = configService.get('app.port') || 3001;
  const apiPrefix = configService.get('app.apiPrefix') || 'api/v1';
  const frontendUrl = configService.get('app.frontendUrl') || 'http://localhost:3000';
  const isProduction = configService.get('app.nodeEnv') === 'production';

  // Security
  app.use(helmet());
  app.use(cookieParser());

  // CORS
  app.enableCors({
    origin: isProduction ? [frontendUrl] : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Language',
      'X-Request-Id',
    ],
  });

  // Global prefix
  app.setGlobalPrefix(apiPrefix);

  // Validation
  app.useGlobalPipes(
    new I18nValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger
  if (!isProduction) {
    setupSwagger(app);
  }

  await app.listen(port);

  // Pretty startup logs
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                                                              ║');
  console.log('║   🏡  CareCircle API Server                                  ║');
  console.log('║                                                              ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║                                                              ║');
  console.log(`║   🚀  API:      http://localhost:${port}/${apiPrefix}`.padEnd(67) + '║');
  console.log(`║   📚  Swagger:  http://localhost:${port}/api`.padEnd(67) + '║');
  console.log(`║   🌐  Frontend: ${frontendUrl}`.padEnd(67) + '║');
  console.log('║                                                              ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║                                                              ║');
  console.log(`║   📧  Mail:     ${configService.get('mail.provider') || 'mailtrap'}`.padEnd(67) + '║');
  console.log(`║   📦  Storage:  ${configService.get('storage.provider') || 'cloudinary'}`.padEnd(67) + '║');
  console.log(`║   🗄️   Database: ${configService.get('database.host') || 'localhost'}:${configService.get('database.port') || 5432}`.padEnd(66) + '║');
  console.log(`║   ⚡  Redis:    ${configService.get('redis.host') || 'localhost'}:${configService.get('redis.port') || 6379}`.padEnd(67) + '║');
  console.log('║                                                              ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║                                                              ║');
  console.log(`║   Mode: ${isProduction ? '🔒 Production' : '🔧 Development'}`.padEnd(67) + '║');
  console.log('║                                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
}

bootstrap();
