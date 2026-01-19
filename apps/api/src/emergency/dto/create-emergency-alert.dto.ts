import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmergencyType } from '@prisma/client';

export class CreateEmergencyAlertDto {
  @ApiProperty({
    description: 'Type of emergency',
    enum: EmergencyType,
    example: 'FALL',
  })
  @IsEnum(EmergencyType)
  @IsNotEmpty()
  type: EmergencyType;

  @ApiProperty({ description: 'Alert title', example: 'Fall detected in bathroom' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Detailed description of the emergency', example: 'Care recipient fell in the bathroom and needs assistance' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Location where emergency occurred', example: 'Bathroom, 2nd floor' })
  @IsString()
  @IsOptional()
  location?: string;
}
