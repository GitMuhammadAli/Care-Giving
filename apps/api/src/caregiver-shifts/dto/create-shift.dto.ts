import { IsDateString, IsNotEmpty, IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShiftDto {
  @ApiProperty({ description: 'Shift start time (ISO 8601)', example: '2024-03-15T08:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ description: 'Shift end time (ISO 8601)', example: '2024-03-15T16:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @ApiProperty({ description: 'ID of the caregiver assigned to this shift', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  caregiverId: string;

  @ApiPropertyOptional({ description: 'Additional notes for the shift', example: 'Morning medication assistance needed' })
  @IsString()
  @IsOptional()
  notes?: string;
}
