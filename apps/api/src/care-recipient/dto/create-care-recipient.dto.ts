import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsArray,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Blood type enum defined locally as it's not in Prisma schema
export enum BloodType {
  A_POSITIVE = 'A+',
  A_NEGATIVE = 'A-',
  B_POSITIVE = 'B+',
  B_NEGATIVE = 'B-',
  AB_POSITIVE = 'AB+',
  AB_NEGATIVE = 'AB-',
  O_POSITIVE = 'O+',
  O_NEGATIVE = 'O-',
  UNKNOWN = 'Unknown',
}

export class CreateCareRecipientDto {
  @ApiProperty({ example: 'Margaret Thompson' })
  @IsString()
  @MaxLength(100)
  fullName: string;

  @ApiPropertyOptional({ example: 'Grandma Maggie' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  preferredName?: string;

  @ApiPropertyOptional({ example: '1946-03-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: BloodType })
  @IsOptional()
  @IsEnum(BloodType)
  bloodType?: BloodType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  photoUrl?: string;

  @ApiPropertyOptional({ example: ['Penicillin', 'Sulfa drugs'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @ApiPropertyOptional({ example: ['Type 2 Diabetes', 'Hypertension'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  conditions?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ example: 'Memorial Hospital' })
  @IsOptional()
  @IsString()
  primaryHospital?: string;

  @ApiPropertyOptional({ example: '123 Hospital Drive, Springfield, IL' })
  @IsOptional()
  @IsString()
  hospitalAddress?: string;

  @ApiPropertyOptional({ example: 'BlueCross BlueShield' })
  @IsOptional()
  @IsString()
  insuranceProvider?: string;

  @ApiPropertyOptional({ example: 'BCB123456789' })
  @IsOptional()
  @IsString()
  insurancePolicyNo?: string;
}

