import { IsString, IsNotEmpty, IsEnum, IsOptional, IsObject, IsArray, IsDateString } from 'class-validator';
import { TimelineType, Severity } from '@prisma/client';

export class CreateTimelineEntryDto {
  @IsEnum(TimelineType)
  @IsNotEmpty()
  type: TimelineType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(Severity)
  @IsOptional()
  severity?: Severity;

  @IsObject()
  @IsOptional()
  vitals?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    bloodSugar?: number;
    oxygenLevel?: number;
    weight?: number;
  };

  @IsDateString()
  @IsOptional()
  occurredAt?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];
}
