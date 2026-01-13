import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EmergencyType } from '@prisma/client';

export class CreateEmergencyAlertDto {
  @IsEnum(EmergencyType)
  @IsNotEmpty()
  type: EmergencyType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  location?: string;
}
