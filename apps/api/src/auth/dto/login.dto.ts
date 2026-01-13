import { IsEmail, IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class LoginDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({ example: 'SecureP@ss123!' })
  @IsString()
  password: string;

  @ApiPropertyOptional({ description: 'Remember me for extended session' })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
