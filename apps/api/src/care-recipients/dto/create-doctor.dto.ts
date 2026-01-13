import { IsString, IsOptional, IsEmail, MinLength } from 'class-validator';

export class CreateDoctorDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  specialty: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  fax?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

