import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiPropertyOptional({ description: 'Refresh token (optional if sent via httpOnly cookie)' })
  @IsString()
  @IsOptional()
  refreshToken?: string;
}

