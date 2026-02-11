import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';

/**
 * Global exception filter with Sentry integration.
 *
 * Captures all 5xx errors and sends them to Sentry when SENTRY_DSN is configured.
 * Non-5xx errors (client errors) are logged locally but not sent to Sentry.
 */
@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Log the error
    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    // Send to Sentry for server errors (5xx) when configured
    if (status >= 500 && Sentry.isInitialized()) {
      Sentry.captureException(exception, {
        tags: {
          method: request.method,
          url: request.url,
          statusCode: String(status),
        },
        user: {
          id: (request as any).user?.id,
          email: (request as any).user?.email,
        },
        extra: {
          body: request.body,
          query: request.query,
          params: request.params,
        },
      });
    }

    // Send response
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message:
        typeof message === 'string'
          ? message
          : (message as any).message || 'Error occurred',
      ...(process.env.NODE_ENV === 'development' && {
        error:
          exception instanceof Error ? exception.message : String(exception),
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    });
  }
}
