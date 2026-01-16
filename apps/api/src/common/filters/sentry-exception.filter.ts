import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global exception filter with Sentry integration
 *
 * To enable Sentry:
 * 1. Install: npm install @sentry/node @sentry/profiling-node
 * 2. Add SENTRY_DSN to environment variables
 * 3. Initialize Sentry in main.ts:
 *
 * import * as Sentry from '@sentry/node';
 *
 * Sentry.init({
 *   dsn: process.env.SENTRY_DSN,
 *   environment: process.env.NODE_ENV,
 *   tracesSampleRate: 1.0,
 * });
 *
 * 4. Uncomment the Sentry.captureException() calls below
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

    // Send to Sentry for non-4xx errors (uncomment when Sentry is configured)
    if (status >= 500) {
      // import * as Sentry from '@sentry/node';
      // Sentry.captureException(exception, {
      //   tags: {
      //     method: request.method,
      //     url: request.url,
      //     statusCode: status,
      //   },
      //   user: {
      //     id: request.user?.id,
      //     email: request.user?.email,
      //   },
      //   extra: {
      //     body: request.body,
      //     query: request.query,
      //     params: request.params,
      //   },
      // });
    }

    // Send response
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: typeof message === 'string' ? message : (message as any).message || 'Error occurred',
      ...(process.env.NODE_ENV === 'development' && {
        error: exception instanceof Error ? exception.message : String(exception),
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    });
  }
}
