import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { LoggingService } from '../module/logging';
import { LogLevel } from '@prisma/client';
import { v4 as uuid } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(private readonly loggingService: LoggingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user } = request;
    const startTime = Date.now();
    const requestId = request.headers['x-request-id'] || uuid();
    const controller = context.getClass().name;
    const handler = context.getHandler().name;

    // Attach requestId to request for downstream use
    request.requestId = requestId;

    // Skip logging for health checks and metrics
    if (url.includes('/health') || url.includes('/metrics')) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async () => {
        const duration = Date.now() - startTime;
        const statusCode = context.switchToHttp().getResponse().statusCode;

        // Log slow requests as warnings
        const level = duration > 3000 ? LogLevel.WARN : LogLevel.INFO;

        await this.loggingService.log({
          level,
          message: `${method} ${url} ${statusCode} - ${duration}ms`,
          service: 'api',
          context: `${controller}.${handler}`,
          requestId,
          userId: user?.id,
          metadata: {
            method,
            url,
            statusCode,
            duration,
            userAgent: request.headers['user-agent'],
            ip: request.ip || request.headers['x-forwarded-for'],
          },
        });

        // Also log to console
        this.logger.log(`${method} ${url} ${statusCode} - ${duration}ms [${requestId}]`);
      }),
      catchError(async (error) => {
        const duration = Date.now() - startTime;

        await this.loggingService.log({
          level: LogLevel.ERROR,
          message: `${method} ${url} FAILED - ${error.message}`,
          service: 'api',
          context: `${controller}.${handler}`,
          requestId,
          userId: user?.id,
          error,
          metadata: {
            method,
            url,
            duration,
            errorName: error.name,
            errorCode: error.status || error.statusCode,
            userAgent: request.headers['user-agent'],
            ip: request.ip || request.headers['x-forwarded-for'],
          },
        });

        throw error;
      }),
    );
  }
}
