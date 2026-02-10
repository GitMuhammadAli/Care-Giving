import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  Inject,
  Optional,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { I18nContext, I18nValidationException } from 'nestjs-i18n';
import { LoggingService } from '../module/logging';

@Catch(I18nValidationException, BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  constructor(
    @Optional() @Inject(LoggingService) private readonly loggingService?: LoggingService,
  ) {}

  catch(
    exception: I18nValidationException | BadRequestException,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const i18nContext = I18nContext.current();

    let errors: Record<string, string[]> = {};
    let message = 'Validation failed';

    if (exception instanceof I18nValidationException) {
      const validationErrors = exception.errors || [];

      for (const error of validationErrors) {
        const field = error.property;
        const constraints = error.constraints || {};
        const messages = Object.values(constraints);
        if (messages.length > 0) {
          errors[field] = messages;
        }

        // Also process nested children if present
        if (error.children && error.children.length > 0) {
          for (const child of error.children) {
            const childField = `${field}.${child.property}`;
            const childConstraints = child.constraints || {};
            const childMessages = Object.values(childConstraints);
            if (childMessages.length > 0) {
              errors[childField] = childMessages;
            }
          }
        }
      }

      // If no specific field errors were extracted, provide a descriptive message
      if (Object.keys(errors).length === 0 && validationErrors.length > 0) {
        message = 'Validation failed: invalid input data';
        // Extract any available info from the raw validation errors
        for (const error of validationErrors) {
          const allConstraints = this.collectConstraints(error);
          if (allConstraints.length > 0) {
            errors[error.property || 'unknown'] = allConstraints;
          }
        }
      }

      message = 'Validation failed';
    } else if (exception instanceof BadRequestException) {
      const exceptionResponse = exception.getResponse() as any;

      if (exceptionResponse.message && Array.isArray(exceptionResponse.message)) {
        // NestJS default validation pipe format
        for (const msg of exceptionResponse.message) {
          const fieldMatch = msg.match(/^(\w+)\s/);
          const field = fieldMatch ? fieldMatch[1] : 'general';
          if (!errors[field]) {
            errors[field] = [];
          }
          errors[field].push(msg);
        }
      } else if (typeof exceptionResponse.message === 'string') {
        message = exceptionResponse.message;
      }
    }

    // Build a descriptive message if we have field errors
    const errorCount = Object.keys(errors).length;
    if (errorCount > 0) {
      const fieldNames = Object.keys(errors).join(', ');
      message = `Validation failed for: ${fieldNames}`;
    }

    // Log the validation error to the database for the System Logs viewer
    this.logValidationError(request, errors, message);

    response.status(400).json({
      statusCode: 400,
      message,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  /**
   * Recursively collect all constraint messages from a validation error
   */
  private collectConstraints(error: any): string[] {
    const messages: string[] = [];
    if (error.constraints) {
      messages.push(...Object.values(error.constraints) as string[]);
    }
    if (error.children && error.children.length > 0) {
      for (const child of error.children) {
        messages.push(...this.collectConstraints(child));
      }
    }
    return messages;
  }

  /**
   * Log validation errors to the ApplicationLog table so they appear in System Logs
   */
  private async logValidationError(
    request: Request,
    errors: Record<string, string[]>,
    message: string,
  ): Promise<void> {
    const sanitizedBody = this.sanitizeBody(request.body);

    const logMessage = `VALIDATION_ERROR ${request.method} ${request.url} — ${message}`;

    // Log to console for immediate terminal visibility
    this.logger.warn(logMessage);
    if (Object.keys(errors).length > 0) {
      this.logger.warn(`  Field errors: ${JSON.stringify(errors)}`);
    }

    // Log to database if LoggingService is available
    if (this.loggingService) {
      try {
        await this.loggingService.warn(
          logMessage,
          'api',
          'ValidationExceptionFilter',
          {
            method: request.method,
            url: request.url,
            errors,
            requestBody: sanitizedBody,
            userAgent: request.headers['user-agent'],
            ip: request.ip || request.headers['x-forwarded-for'],
            requestId: (request as any).requestId,
            userId: (request as any).user?.id,
          },
        );
      } catch (err) {
        // Don't let logging failures affect the response
        this.logger.error(`Failed to log validation error: ${err}`);
      }
    }
  }

  /**
   * Remove sensitive fields from the request body before logging
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'accessToken', 'refreshToken', 'apiKey'];
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }
    return sanitized;
  }
}

