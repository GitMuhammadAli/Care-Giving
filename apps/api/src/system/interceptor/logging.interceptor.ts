import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { LoggingService } from '../module/logging';
import { LogLevel } from '@prisma/client';
import { v4 as uuid } from 'uuid';

const SENSITIVE_FIELDS = new Set(['password', 'token', 'secret', 'accessToken', 'refreshToken', 'apiKey']);

function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') return body;
  const sanitized = { ...body };
  for (const field of Object.keys(sanitized)) {
    if (SENSITIVE_FIELDS.has(field)) {
      sanitized[field] = '[REDACTED]';
    }
  }
  return sanitized;
}

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
          message: `${method} ${url} ${statusCode} — ${duration}ms`,
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

        // Also log to console (terminal-like output)
        this.logger.log(`${method} ${url} ${statusCode} — ${duration}ms [${requestId}]`);
      }),
      catchError(async (error) => {
        const duration = Date.now() - startTime;
        const statusCode = error.status || error.statusCode || 500;
        const isValidationError = statusCode === 400 || error instanceof BadRequestException;

        // Determine log level based on status code
        const level = statusCode >= 500 ? LogLevel.ERROR : LogLevel.WARN;

        // Build detailed metadata — include request body for non-GET error requests
        const metadata: Record<string, any> = {
          method,
          url,
          statusCode,
          duration,
          errorName: error.name,
          errorCode: statusCode,
          userAgent: request.headers['user-agent'],
          ip: request.ip || request.headers['x-forwarded-for'],
        };

        // Include sanitized request body for debugging (especially validation errors)
        if (method !== 'GET' && body && Object.keys(body).length > 0) {
          metadata.requestBody = sanitizeBody(body);
        }

        // Include validation error details if available
        if (isValidationError) {
          const errorResponse = typeof error.getResponse === 'function' ? error.getResponse() : null;
          if (errorResponse && typeof errorResponse === 'object') {
            metadata.validationErrors = (errorResponse as any).message || (errorResponse as any).errors;
          }
        }

        await this.loggingService.log({
          level,
          message: `${method} ${url} ${statusCode} FAILED — ${error.message} [${duration}ms]`,
          service: 'api',
          context: `${controller}.${handler}`,
          requestId,
          userId: user?.id,
          error: statusCode >= 500 ? error : undefined, // Only include stack for 5xx errors
          metadata,
        });

        // Console output for terminal visibility
        const logFn = statusCode >= 500 ? 'error' : 'warn';
        this.logger[logFn](
          `${method} ${url} ${statusCode} FAILED — ${error.message} [${requestId}] ${duration}ms`,
        );

        throw error;
      }),
    );
  }
}
