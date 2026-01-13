import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsPhoneNumber,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';

export class RegisterDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(2, { message: i18nValidationMessage('validation.MIN_LENGTH') })
  @MaxLength(100, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  fullName: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail({}, { message: i18nValidationMessage('validation.IS_EMAIL') })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({ example: 'SecureP@ss123!' })
  @IsString()
  @MinLength(12, { message: i18nValidationMessage('validation.PASSWORD_MIN_LENGTH') })
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: i18nValidationMessage('validation.PASSWORD_STRENGTH'),
  })
  password: string;

  @ApiPropertyOptional({ example: '+15551234567' })
  @IsOptional()
  @IsPhoneNumber(undefined, { message: i18nValidationMessage('validation.IS_PHONE') })
  phone?: string;

  @ApiPropertyOptional({ example: 'America/New_York' })
  @IsOptional()
  @IsString()
  timezone?: string;
}
