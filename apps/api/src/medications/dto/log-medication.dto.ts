import { IsEnum, IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';
import { MedicationLogStatus } from '@prisma/client';

export class LogMedicationDto {
  @IsEnum(MedicationLogStatus)
  @IsNotEmpty()
  status: MedicationLogStatus;

  @IsDateString()
  @IsNotEmpty()
  scheduledTime: string;

  @IsString()
  @IsOptional()
  skipReason?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
