import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDateString, IsArray, IsBoolean, IsInt, IsUUID, Min } from 'class-validator';
import { AppointmentType } from '@prisma/client';

// Import TypeORM enum for backward compatibility with TypeORM-based service
export enum RecurrencePattern {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
}

export class CreateAppointmentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(AppointmentType)
  type: AppointmentType;

  @IsUUID()
  @IsOptional()
  doctorId?: string;

  @IsString()
  @IsOptional()
  doctorName?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  address?: string;

  // Prisma schema fields
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsDateString()
  @IsOptional()
  endTime?: string;

  // TypeORM entity fields
  @IsDateString()
  @IsOptional()
  dateTime?: string;

  @IsInt()
  @IsOptional()
  @Min(15)
  duration?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @IsString()
  @IsOptional()
  recurrenceRule?: string;

  @IsEnum(RecurrencePattern)
  @IsOptional()
  recurrence?: RecurrencePattern;

  @IsDateString()
  @IsOptional()
  recurrenceEndDate?: string;

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  reminderMinutes?: number[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  reminderBefore?: string[];

  @IsUUID()
  @IsOptional()
  transportAssignedToId?: string;
}
