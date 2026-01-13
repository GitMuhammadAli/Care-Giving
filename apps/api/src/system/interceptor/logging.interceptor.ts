import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ContextHelper } from '../helper/context.helper';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;
    const now = Date.now();

    const userId = ContextHelper.getUserId();
    const ip = ContextHelper.getIp();

    // Sanitize body for logging (remove sensitive fields)
    const sanitizedBody = this.sanitizeBody(body);

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const duration = Date.now() - now;

          this.logger.log(
            `${method} ${url} ${statusCode} ${duration}ms - User: ${userId || 'anonymous'} - IP: ${ip}`,
          );
        },
        error: (error) => {
          const duration = Date.now() - now;

          this.logger.error(
            `${method} ${url} ${error.status || 500} ${duration}ms - User: ${userId || 'anonymous'} - IP: ${ip}`,
            error.stack,
          );
        },
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return null;

    const sensitiveFields = ['password', 'token', 'accessToken', 'refreshToken', 'otp'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}

