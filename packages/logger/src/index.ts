/**
 * @carecircle/logger - Production-grade structured logging
 * 
 * Features:
 * - Structured JSON logging with pino
 * - PII redaction (emails, tokens, passwords)
 * - Correlation IDs for request tracing
 * - Service-specific loggers
 * - Log levels per environment
 * - Pretty printing in development
 */

import pino, { Logger, LoggerOptions } from 'pino';

// ============================================================================
// TYPES
// ============================================================================

export interface LogContext {
  service: string;
  requestId?: string;
  userId?: string;
  jobId?: string;
  [key: string]: unknown;
}

export interface CreateLoggerOptions {
  service: string;
  level?: string;
  pretty?: boolean;
}

// ============================================================================
// PII REDACTION PATHS
// ============================================================================

const REDACT_PATHS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'authorization',
  'cookie',
  'creditCard',
  'ssn',
  'privateKey',
  // Nested paths
  'req.headers.authorization',
  'req.headers.cookie',
  'data.password',
  'data.token',
  'user.passwordHash',
  'user.email', // Redact emails in logs
  '*.password',
  '*.token',
  '*.secret',
];

// ============================================================================
// LOGGER FACTORY
// ============================================================================

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

/**
 * Create a service-specific logger instance
 */
export function createLogger(options: CreateLoggerOptions): Logger {
  const { service, level, pretty } = options;

  const logLevel = level || process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');
  const usePretty = pretty ?? isDevelopment;

  const pinoOptions: LoggerOptions = {
    name: service,
    level: isTest ? 'silent' : logLevel,
    redact: {
      paths: REDACT_PATHS,
      censor: '[REDACTED]',
    },
    formatters: {
      level: (label) => ({ level: label }),
      bindings: (bindings) => ({
        service: bindings.name,
        pid: bindings.pid,
        hostname: bindings.hostname,
      }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    // Add base context
    base: {
      service,
      env: process.env.NODE_ENV || 'development',
    },
  };

  // Pretty print in development
  if (usePretty) {
    return pino({
      ...pinoOptions,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          messageFormat: '[{service}] {msg}',
        },
      },
    });
  }

  return pino(pinoOptions);
}

// ============================================================================
// CHILD LOGGER WITH CONTEXT
// ============================================================================

/**
 * Create a child logger with additional context (requestId, userId, jobId)
 */
export function withContext(logger: Logger, context: Partial<LogContext>): Logger {
  return logger.child(context);
}

/**
 * Create a job-specific logger for BullMQ workers
 */
export function createJobLogger(baseLogger: Logger, jobId: string, jobName?: string): Logger {
  return baseLogger.child({
    jobId,
    jobName,
  });
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

// Default loggers for common services
export const apiLogger = createLogger({ service: 'api' });
export const workerLogger = createLogger({ service: 'workers' });
export const webLogger = createLogger({ service: 'web' });
export const dbLogger = createLogger({ service: 'database' });

// Re-export types
export type { Logger } from 'pino';

// ============================================================================
// ERROR SERIALIZATION HELPER
// ============================================================================

/**
 * Safely serialize an error for logging
 */
export function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const serialized: Record<string, unknown> = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
    
    // Copy any additional properties from the error
    for (const key of Object.keys(error)) {
      if (!(key in serialized)) {
        serialized[key] = (error as unknown as Record<string, unknown>)[key];
      }
    }
    
    return serialized;
  }
  return { message: String(error) };
}

// ============================================================================
// LOG LEVEL HELPERS
// ============================================================================

export const LogLevel = {
  FATAL: 'fatal',
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  TRACE: 'trace',
} as const;

export type LogLevelType = (typeof LogLevel)[keyof typeof LogLevel];

