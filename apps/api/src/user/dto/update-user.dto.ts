import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsPhoneNumber,
  IsUrl,
  IsObject,
  ValidateNested,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class NotificationPreferences {
  @IsBoolean()
  email: boolean;

  @IsBoolean()
  push: boolean;

  @IsBoolean()
  sms: boolean;

  @IsBoolean()
  emergencyOnly: boolean;
}

class DisplayPreferences {
  @IsIn(['light', 'dark', 'system'])
  theme: 'light' | 'dark' | 'system';

  @IsString()
  language: string;
}

class UserPreferences {
  @ValidateNested()
  @Type(() => NotificationPreferences)
  notifications: NotificationPreferences;

  @ValidateNested()
  @Type(() => DisplayPreferences)
  display: DisplayPreferences;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ example: '+15551234567' })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'America/New_York' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UserPreferences)
  preferences?: UserPreferences;
}

