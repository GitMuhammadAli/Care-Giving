import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDateString, IsArray, IsBoolean, IsInt, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentType } from '@prisma/client';

// Recurrence pattern enum
export enum RecurrencePattern {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
}

export class CreateAppointmentDto {
  @ApiProperty({ description: 'Appointment title', example: 'Annual Checkup' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Type of appointment',
    enum: AppointmentType,
    example: 'DOCTOR_VISIT',
  })
  @IsEnum(AppointmentType)
  type: AppointmentType;

  @ApiPropertyOptional({ description: 'ID of the assigned doctor', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  doctorId?: string;

  @ApiPropertyOptional({ description: 'Name of the doctor', example: 'Dr. Smith' })
  @IsString()
  @IsOptional()
  doctorName?: string;

  @ApiPropertyOptional({ description: 'Location name', example: 'City Hospital' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: 'Full address', example: '123 Main St, City, State 12345' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Start time (ISO 8601)', example: '2024-03-15T09:00:00Z' })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ description: 'End time (ISO 8601)', example: '2024-03-15T10:00:00Z' })
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Date and time (alternative to startTime)',
    example: '2024-03-15T09:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  dateTime?: string;

  @ApiPropertyOptional({ description: 'Duration in minutes (minimum 15)', example: 60, minimum: 15 })
  @IsInt()
  @IsOptional()
  @Min(15)
  duration?: number;

  @ApiPropertyOptional({ description: 'Additional notes', example: 'Bring previous test results' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Whether this is a recurring appointment', default: false })
  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @ApiPropertyOptional({ description: 'Recurrence rule (iCal RRULE format)', example: 'FREQ=WEEKLY;BYDAY=MO' })
  @IsString()
  @IsOptional()
  recurrenceRule?: string;

  @ApiPropertyOptional({
    description: 'Recurrence pattern',
    enum: RecurrencePattern,
    example: RecurrencePattern.WEEKLY,
  })
  @IsEnum(RecurrencePattern)
  @IsOptional()
  recurrence?: RecurrencePattern;

  @ApiPropertyOptional({ description: 'When recurrence ends', example: '2024-12-31T23:59:59Z' })
  @IsDateString()
  @IsOptional()
  recurrenceEndDate?: string;

  @ApiPropertyOptional({
    description: 'Reminder times in minutes before appointment',
    example: [60, 1440],
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  reminderMinutes?: number[];

  @ApiPropertyOptional({
    description: 'Reminder times before appointment (human readable)',
    example: ['1 hour', '1 day'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  reminderBefore?: string[];

  @ApiPropertyOptional({ description: 'ID of user assigned for transport', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  transportAssignedToId?: string;
}
