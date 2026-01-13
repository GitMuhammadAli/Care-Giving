import { IsString, IsOptional, IsEmail, IsBoolean, MinLength } from 'class-validator';

export class CreateEmergencyContactDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  relationship: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

