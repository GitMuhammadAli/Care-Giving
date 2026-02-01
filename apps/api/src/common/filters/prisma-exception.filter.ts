import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

/**
 * Prisma Exception Filter
 * 
 * Catches Prisma-specific errors and returns user-friendly responses
 * instead of exposing raw database errors to clients.
 */
@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientUnknownRequestError, Prisma.PrismaClientInitializationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientUnknownRequestError | Prisma.PrismaClientInitializationError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected database error occurred';
    let error = 'Internal Server Error';

    // Handle known Prisma errors
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const result = this.handleKnownError(exception);
      status = result.status;
      message = result.message;
      error = result.error;
    }
    // Handle unknown Prisma errors
    else if (exception instanceof Prisma.PrismaClientUnknownRequestError) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'A database error occurred. Please try again later.';
      error = 'Database Error';
    }
    // Handle initialization errors (connection issues, missing tables)
    else if (exception instanceof Prisma.PrismaClientInitializationError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'Database service is temporarily unavailable. Please try again later.';
      error = 'Service Unavailable';
    }

    // Log the full error for debugging
    this.logger.error(
      `Prisma Error [${exception instanceof Prisma.PrismaClientKnownRequestError ? exception.code : 'UNKNOWN'}]: ${exception.message}`,
      {
        path: request.url,
        method: request.method,
        code: exception instanceof Prisma.PrismaClientKnownRequestError ? exception.code : undefined,
        meta: exception instanceof Prisma.PrismaClientKnownRequestError ? exception.meta : undefined,
      }
    );

    // Send user-friendly response
    response.status(status).json({
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      // Only include debug info in development
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          code: exception instanceof Prisma.PrismaClientKnownRequestError ? exception.code : 'UNKNOWN',
          originalMessage: exception.message,
        },
      }),
    });
  }

  /**
   * Handle known Prisma error codes
   * @see https://www.prisma.io/docs/reference/api-reference/error-reference
   */
  private handleKnownError(exception: Prisma.PrismaClientKnownRequestError): {
    status: number;
    message: string;
    error: string;
  } {
    switch (exception.code) {
      // Value too long for column
      case 'P2000':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'The provided value is too long for this field.',
          error: 'Bad Request',
        };

      // Unique constraint violation
      case 'P2002': {
        const field = this.extractField(exception.meta);
        return {
          status: HttpStatus.CONFLICT,
          message: field 
            ? `A record with this ${field} already exists.`
            : 'A record with these values already exists.',
          error: 'Conflict',
        };
      }

      // Foreign key constraint violation
      case 'P2003': {
        const field = this.extractField(exception.meta);
        return {
          status: HttpStatus.BAD_REQUEST,
          message: field
            ? `Invalid reference: The specified ${field} does not exist.`
            : 'Invalid reference: The related record does not exist.',
          error: 'Bad Request',
        };
      }

      // Required field missing
      case 'P2011': {
        const field = this.extractField(exception.meta);
        return {
          status: HttpStatus.BAD_REQUEST,
          message: field
            ? `The field '${field}' is required.`
            : 'A required field is missing.',
          error: 'Bad Request',
        };
      }

      // Invalid ID format
      case 'P2023':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid ID format provided.',
          error: 'Bad Request',
        };

      // Record not found
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'The requested record was not found.',
          error: 'Not Found',
        };

      // Table does not exist
      case 'P2021':
        return {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Database service is temporarily unavailable. Please try again later.',
          error: 'Service Unavailable',
        };

      // Column does not exist
      case 'P2022':
        return {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Database service is temporarily unavailable. Please try again later.',
          error: 'Service Unavailable',
        };

      // Connection error
      case 'P1001':
        return {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Unable to connect to the database. Please try again later.',
          error: 'Service Unavailable',
        };

      // Database timeout
      case 'P1008':
        return {
          status: HttpStatus.GATEWAY_TIMEOUT,
          message: 'Database operation timed out. Please try again.',
          error: 'Gateway Timeout',
        };

      // Database authentication failed
      case 'P1000':
        return {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Database service is temporarily unavailable. Please try again later.',
          error: 'Service Unavailable',
        };

      // Default for other known errors
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'A database error occurred. Please try again later.',
          error: 'Internal Server Error',
        };
    }
  }

  /**
   * Extract field name from Prisma error meta
   */
  private extractField(meta: unknown): string | null {
    if (!meta || typeof meta !== 'object') {
      return null;
    }

    const metaObj = meta as Record<string, unknown>;

    // For unique constraint violations
    if (metaObj.target && Array.isArray(metaObj.target)) {
      return metaObj.target.join(', ');
    }

    // For foreign key violations
    if (metaObj.field_name && typeof metaObj.field_name === 'string') {
      return metaObj.field_name.replace(/_/g, ' ');
    }

    // For required field violations
    if (metaObj.constraint && typeof metaObj.constraint === 'string') {
      return metaObj.constraint;
    }

    return null;
  }
}

/**
 * Catch-all for any Prisma errors that slip through
 * This includes connection pool errors, validation errors, etc.
 */
@Catch()
export class PrismaClientExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaClientExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    // Only handle Prisma-related errors
    if (!this.isPrismaError(exception)) {
      throw exception; // Re-throw for other filters to handle
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    this.logger.error('Unhandled Prisma error', {
      error: exception instanceof Error ? exception.message : String(exception),
      path: request.url,
    });

    response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message: 'Database service is temporarily unavailable. Please try again later.',
      error: 'Service Unavailable',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private isPrismaError(exception: unknown): boolean {
    if (exception instanceof Error) {
      return (
        exception.name.includes('Prisma') ||
        exception.message.includes('prisma') ||
        exception.message.includes('database')
      );
    }
    return false;
  }
}

