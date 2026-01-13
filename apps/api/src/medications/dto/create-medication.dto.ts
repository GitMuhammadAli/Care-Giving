import { IsString, IsNotEmpty, IsEnum, IsArray, IsOptional, IsInt, IsDateString, Min } from 'class-validator';
import { MedicationForm, MedicationFrequency } from '@prisma/client';

export class CreateMedicationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  genericName?: string;

  @IsString()
  @IsNotEmpty()
  dosage: string;

  @IsEnum(MedicationForm)
  form: MedicationForm;

  @IsEnum(MedicationFrequency)
  frequency: MedicationFrequency;

  @IsInt()
  @IsOptional()
  @Min(1)
  timesPerDay?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scheduledTimes?: string[];

  @IsString()
  @IsOptional()
  instructions?: string;

  @IsString()
  @IsOptional()
  prescribedBy?: string;

  @IsString()
  @IsOptional()
  pharmacy?: string;

  @IsString()
  @IsOptional()
  pharmacyPhone?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  currentSupply?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  refillAt?: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
