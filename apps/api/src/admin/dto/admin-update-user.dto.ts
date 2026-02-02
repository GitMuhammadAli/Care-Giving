import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsBoolean, MaxLength, IsEmail } from 'class-validator';
import { SystemRole } from '@prisma/client';

export class AdminUpdateUserDto {
  @ApiPropertyOptional({ description: 'User full name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ description: 'User email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'User phone' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: 'User status (ACTIVE, PENDING, SUSPENDED)' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'System role', enum: SystemRole })
  @IsOptional()
  @IsEnum(SystemRole)
  systemRole?: SystemRole;

  @ApiPropertyOptional({ description: 'Email verified status' })
  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;

  @ApiPropertyOptional({ description: 'Timezone' })
  @IsOptional()
  @IsString()
  timezone?: string;
}

export class AdminCreateUserDto {
  @ApiPropertyOptional({ description: 'User email' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'User full name' })
  @IsString()
  @MaxLength(100)
  fullName: string;

  @ApiPropertyOptional({ description: 'User phone' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: 'Temporary password (will be emailed to user)' })
  @IsOptional()
  @IsString()
  tempPassword?: string;

  @ApiPropertyOptional({ description: 'System role', enum: SystemRole, default: SystemRole.USER })
  @IsOptional()
  @IsEnum(SystemRole)
  systemRole?: SystemRole;

  @ApiPropertyOptional({ description: 'Skip email verification', default: false })
  @IsOptional()
  @IsBoolean()
  skipEmailVerification?: boolean;
}

