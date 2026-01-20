import { IsString, IsOptional, IsEmail, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDoctorDto {
  @ApiProperty({ example: 'Dr. Jennifer Smith' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'Cardiology' })
  @IsString()
  specialty: string;

  @ApiProperty({ example: '555-456-7890' })
  @IsString()
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fax?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '456 Medical Center Drive, Springfield, IL' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

