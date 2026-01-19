import { IsString, IsNotEmpty, IsEnum, IsArray, IsOptional, IsInt, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MedicationForm, MedicationFrequency } from '@prisma/client';

export class CreateMedicationDto {
  @ApiProperty({ description: 'Medication name', example: 'Lisinopril' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Generic name of the medication', example: 'Lisinopril' })
  @IsString()
  @IsOptional()
  genericName?: string;

  @ApiProperty({ description: 'Dosage amount and unit', example: '10mg' })
  @IsString()
  @IsNotEmpty()
  dosage: string;

  @ApiProperty({
    description: 'Form of medication',
    enum: MedicationForm,
    example: 'TABLET',
  })
  @IsEnum(MedicationForm)
  form: MedicationForm;

  @ApiProperty({
    description: 'How often to take the medication',
    enum: MedicationFrequency,
    example: 'DAILY',
  })
  @IsEnum(MedicationFrequency)
  frequency: MedicationFrequency;

  @ApiPropertyOptional({ description: 'Number of times per day', example: 2, minimum: 1 })
  @IsInt()
  @IsOptional()
  @Min(1)
  timesPerDay?: number;

  @ApiPropertyOptional({
    description: 'Scheduled times to take medication',
    example: ['08:00', '20:00'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scheduledTimes?: string[];

  @ApiPropertyOptional({ description: 'Special instructions', example: 'Take with food' })
  @IsString()
  @IsOptional()
  instructions?: string;

  @ApiPropertyOptional({ description: 'Prescribing doctor name', example: 'Dr. Smith' })
  @IsString()
  @IsOptional()
  prescribedBy?: string;

  @ApiPropertyOptional({ description: 'Pharmacy name', example: 'CVS Pharmacy' })
  @IsString()
  @IsOptional()
  pharmacy?: string;

  @ApiPropertyOptional({ description: 'Pharmacy phone number', example: '+1-555-123-4567' })
  @IsString()
  @IsOptional()
  pharmacyPhone?: string;

  @ApiPropertyOptional({ description: 'Current supply count', example: 30, minimum: 0 })
  @IsInt()
  @IsOptional()
  @Min(0)
  currentSupply?: number;

  @ApiPropertyOptional({ description: 'Supply count to trigger refill alert', example: 7, minimum: 0 })
  @IsInt()
  @IsOptional()
  @Min(0)
  refillAt?: number;

  @ApiPropertyOptional({ description: 'When to start medication', example: '2024-03-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'When to stop medication', example: '2024-06-01' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Additional notes', example: 'For blood pressure control' })
  @IsString()
  @IsOptional()
  notes?: string;
}
