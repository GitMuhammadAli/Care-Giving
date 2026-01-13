import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { I18nContext, I18nValidationException } from 'nestjs-i18n';

@Catch(I18nValidationException, BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
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
        errors[field] = Object.values(constraints);
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

    response.status(400).json({
      statusCode: 400,
      message,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

