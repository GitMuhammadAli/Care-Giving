import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsInt, Min, Max, IsDateString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { SystemRole } from '@prisma/client';

export class AdminUserFilterDto {
  @ApiPropertyOptional({ description: 'Search by name or email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by user status (ACTIVE, PENDING, SUSPENDED)' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by system role', enum: SystemRole })
  @IsOptional()
  @IsEnum(SystemRole)
  systemRole?: SystemRole;

  @ApiPropertyOptional({ description: 'Filter by email verification status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  emailVerified?: boolean;

  @ApiPropertyOptional({ description: 'Filter users created after this date' })
  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @ApiPropertyOptional({ description: 'Filter users created before this date' })
  @IsOptional()
  @IsDateString()
  createdBefore?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort field', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort direction', default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

