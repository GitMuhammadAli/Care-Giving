import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nValidationPipe, I18nValidationExceptionFilter } from 'nestjs-i18n';
import { ClsService } from 'nestjs-cls';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Request, Response } from 'express';

import { AppModule } from './app.module';
import { setupSwagger } from './swagger';
import { ContextHelper } from './system/helper/context.helper';
import { LoggingInterceptor } from './system/interceptor';
import { LoggingService } from './system/module/logging';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Reduce logging in production for better performance
    logger: process.env.NODE_ENV === 'production' 
      ? ['error', 'warn', 'log'] 
      : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const clsService = app.get(ClsService);
  ContextHelper.setClsService(clsService);

  const port = configService.get('app.port') || process.env.PORT || 4000;
  const apiPrefix = configService.get('app.apiPrefix') || 'api/v1';
  const frontendUrl = configService.get('app.frontendUrl') || 'http://localhost:4173';
  const isProduction = configService.get('app.nodeEnv') === 'production';

  // Trust proxy for Render/Vercel/Cloudflare (required for secure cookies behind reverse proxy)
  if (isProduction) {
    app.set('trust proxy', 1);
  }

  // Security headers with Helmet
  app.use(helmet({
    contentSecurityPolicy: isProduction ? undefined : false, // Disable CSP in dev for hot reload
    crossOriginEmbedderPolicy: false, // Allow embedding for WebSocket connections
  }));
  app.use(cookieParser());

  // Compression (GZIP)
  app.use(
    compression({
      // Only compress responses larger than 1KB
      threshold: 1024,
      // Compression level (0-9, where 9 is maximum compression)
      level: isProduction ? 6 : 1, // Higher compression in production
      // Filter function to determine what to compress
      filter: (req, res) => {
        // Don't compress if explicitly disabled
        if (req.headers['x-no-compression']) {
          return false;
        }
        // Use compression filter
        return compression.filter(req, res);
      },
    }),
  );

  // CORS - Allow multiple origins in production if needed
  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  const allowedOrigins = isProduction 
    ? [frontendUrl, corsOrigin].filter(Boolean) 
    : true;
  
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Language',
      'X-Request-Id',
      'X-Requested-With',
    ],
    exposedHeaders: ['X-Request-Id'],
    maxAge: isProduction ? 86400 : 3600, // Cache preflight for 24h in production
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

  // Swagger - Only available in non-production environments
  // To enable in production, set ENABLE_SWAGGER=true (for internal/staging use only)
  const enableSwagger = !isProduction || configService.get<string>('ENABLE_SWAGGER') === 'true';
  if (enableSwagger) {
    setupSwagger(app);
    if (isProduction) {
      logger.warn('⚠️  Swagger is enabled in production - ensure this is intentional');
    }
  }

  // Global logging interceptor for request/response logging
  const loggingService = app.get(LoggingService);
  app.useGlobalInterceptors(new LoggingInterceptor(loggingService));

  // Enable graceful shutdown
  app.enableShutdownHooks();

  // Root health check for load balancers (Render, etc.)
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (req: Request, res: Response) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: isProduction ? 'production' : 'development'
    });
  });

  await app.listen(port, '0.0.0.0'); // Listen on all interfaces for container deployment

  // Handle graceful shutdown on Windows and Unix
  const shutdown = async (signal: string) => {
    logger.log(`Received ${signal}, shutting down gracefully...`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  // Windows-specific signal
  process.on('SIGBREAK', () => shutdown('SIGBREAK'));
  // Nodemon restart signal
  process.once('SIGUSR2', async () => {
    logger.log('Received SIGUSR2 (nodemon restart), shutting down...');
    await app.close();
    process.kill(process.pid, 'SIGUSR2');
  });

  // Startup logs - minimal in production
  if (isProduction) {
    logger.log(`CareCircle API started on port ${port} [PRODUCTION]`);
    logger.log(`Frontend: ${frontendUrl}`);
  } else {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                                                              ║');
    console.log('║   🏡  CareCircle API Server                                  ║');
    console.log('║                                                              ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║                                                              ║');
    console.log(`║   🚀  API:      http://localhost:${port}/${apiPrefix}`.padEnd(67) + '║');
    if (enableSwagger) {
      console.log(`║   📚  Swagger:  http://localhost:${port}/api`.padEnd(67) + '║');
    }
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
    console.log(`║   Mode: 🔧 Development`.padEnd(67) + '║');
    console.log('║                                                              ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
  }
}

bootstrap();
