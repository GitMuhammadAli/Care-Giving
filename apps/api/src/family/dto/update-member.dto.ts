import { IsEnum, IsOptional, IsString, IsObject, ValidateNested, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { FamilyRole } from '../entity/family-member.entity';

class MemberNotifications {
  @IsBoolean()
  emergencies: boolean;

  @IsBoolean()
  medications: boolean;

  @IsBoolean()
  appointments: boolean;

  @IsBoolean()
  shifts: boolean;
}

export class UpdateMemberDto {
  @ApiPropertyOptional({ enum: FamilyRole })
  @IsOptional()
  @IsEnum(FamilyRole)
  role?: FamilyRole;

  @ApiPropertyOptional({ example: 'Mom' })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => MemberNotifications)
  notifications?: MemberNotifications;
}

