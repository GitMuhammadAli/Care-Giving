import {
  format,
  parseISO,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addMinutes,
  differenceInMinutes,
  differenceInDays,
  isWithinInterval,
  isSameDay,
  isAfter,
  isBefore,
} from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

export class DateHelper {
  static readonly DEFAULT_TIMEZONE = 'America/New_York';
  static readonly DATE_FORMAT = 'yyyy-MM-dd';
  static readonly TIME_FORMAT = 'HH:mm';
  static readonly DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss';
  static readonly DISPLAY_DATE_FORMAT = 'MMMM d, yyyy';
  static readonly DISPLAY_TIME_FORMAT = 'h:mm a';

  static now(timezone?: string): Date {
    const tz = timezone || this.DEFAULT_TIMEZONE;
    return toZonedTime(new Date(), tz);
  }

  static format(date: Date | string, formatStr: string, timezone?: string): string {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (timezone) {
      return formatInTimeZone(d, timezone, formatStr);
    }
    return format(d, formatStr);
  }

  static formatDate(date: Date | string, timezone?: string): string {
    return this.format(date, this.DATE_FORMAT, timezone);
  }

  static formatTime(date: Date | string, timezone?: string): string {
    return this.format(date, this.DISPLAY_TIME_FORMAT, timezone);
  }

  static formatDateTime(date: Date | string, timezone?: string): string {
    return this.format(date, this.DATETIME_FORMAT, timezone);
  }

  static startOfDay(date: Date | string): Date {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return startOfDay(d);
  }

  static endOfDay(date: Date | string): Date {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return endOfDay(d);
  }

  static startOfWeek(date: Date | string): Date {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return startOfWeek(d, { weekStartsOn: 0 });
  }

  static endOfWeek(date: Date | string): Date {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return endOfWeek(d, { weekStartsOn: 0 });
  }

  static startOfMonth(date: Date | string): Date {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return startOfMonth(d);
  }

  static endOfMonth(date: Date | string): Date {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return endOfMonth(d);
  }

  static addDays(date: Date | string, days: number): Date {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return addDays(d, days);
  }

  static addMinutes(date: Date | string, minutes: number): Date {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return addMinutes(d, minutes);
  }

  static differenceInMinutes(dateLeft: Date, dateRight: Date): number {
    return differenceInMinutes(dateLeft, dateRight);
  }

  static differenceInDays(dateLeft: Date, dateRight: Date): number {
    return differenceInDays(dateLeft, dateRight);
  }

  static isWithinRange(date: Date, start: Date, end: Date): boolean {
    return isWithinInterval(date, { start, end });
  }

  static isSameDay(dateLeft: Date, dateRight: Date): boolean {
    return isSameDay(dateLeft, dateRight);
  }

  static isAfter(date: Date, dateToCompare: Date): boolean {
    return isAfter(date, dateToCompare);
  }

  static isBefore(date: Date, dateToCompare: Date): boolean {
    return isBefore(date, dateToCompare);
  }

  static parseTime(timeString: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeString.split(':').map(Number);
    return { hours, minutes };
  }

  static combineDateAndTime(date: Date, timeString: string): Date {
    const { hours, minutes } = this.parseTime(timeString);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }
}

