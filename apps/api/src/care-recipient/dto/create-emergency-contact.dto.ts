import { IsString, IsOptional, IsEmail, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmergencyContactDto {
  @ApiProperty({ example: 'Sarah Thompson' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'Daughter' })
  @IsString()
  relationship: string;

  @ApiProperty({ example: '555-123-4567' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: 'sarah@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

