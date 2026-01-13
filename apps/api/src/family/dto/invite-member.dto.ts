import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { FamilyRole } from '../entity/family-member.entity';

export class InviteMemberDto {
  @ApiProperty({ example: 'sibling@example.com' })
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({ enum: FamilyRole, example: FamilyRole.CAREGIVER })
  @IsEnum(FamilyRole)
  role: FamilyRole;

  @ApiPropertyOptional({ example: 'Join us to help coordinate care for Mom' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
