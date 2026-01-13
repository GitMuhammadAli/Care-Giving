/**
 * Environment Helper
 * ==================
 * Re-exports from centralized config helpers for backward compatibility.
 * New code should import directly from '@/config/env.helpers'.
 */
import {
  isDevelopment,
  isProduction,
  isTest,
  optionalString,
  int,
  bool,
  requiredString,
} from '../../config/env.helpers';

export class EnvHelper {
  static isDevelopment(): boolean {
    return isDevelopment();
  }

  static isProduction(): boolean {
    return isProduction();
  }

  static isTest(): boolean {
    return isTest();
  }

  static get(key: string, defaultValue?: string): string {
    return optionalString(key, defaultValue);
  }

  static getNumber(key: string, defaultValue = 0): number {
    return int(key, defaultValue);
  }

  static getBoolean(key: string, defaultValue = false): boolean {
    return bool(key, defaultValue);
  }

  static require(key: string): string {
    return requiredString(key);
  }
}
