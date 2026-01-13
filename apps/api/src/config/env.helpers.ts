/**
 * Environment Variable Helper Functions
 * ======================================
 * Centralized helpers for parsing environment variables with type safety.
 * All env vars should be accessed through these helpers or the config module.
 */

/**
 * Get a required string environment variable.
 * Throws if the variable is not set.
 */
export function requiredString(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

/**
 * Get an optional string environment variable.
 * Returns defaultValue if not set.
 */
export function optionalString(name: string, defaultValue: string = ''): string {
  const value = process.env[name];
  return value !== undefined && value !== '' ? value : defaultValue;
}

/**
 * Parse an integer environment variable.
 * Returns defaultValue if not set or invalid.
 */
export function int(name: string, defaultValue: number = 0): number {
  const value = process.env[name];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse a boolean environment variable.
 * Accepts: 'true', '1', 'yes' as true; everything else is false.
 */
export function bool(name: string, defaultValue: boolean = false): boolean {
  const value = process.env[name];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return ['true', '1', 'yes'].includes(value.toLowerCase());
}

/**
 * Get a password/secret environment variable.
 * Returns null if empty or not set (for optional passwords).
 */
export function optionalPassword(name: string): string | null {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    return null;
  }
  return value;
}

/**
 * Mask a secret value for logging (shows first 4 and last 4 chars).
 */
export function maskSecret(value: string | null | undefined): string {
  if (!value) return '(not set)';
  if (value.length <= 8) return '****';
  return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
}

/**
 * Check if we're in development mode.
 */
export function isDevelopment(): boolean {
  return optionalString('NODE_ENV', 'development') === 'development';
}

/**
 * Check if we're in production mode.
 */
export function isProduction(): boolean {
  return optionalString('NODE_ENV', 'development') === 'production';
}

/**
 * Check if we're in test mode.
 */
export function isTest(): boolean {
  return optionalString('NODE_ENV', 'development') === 'test';
}
