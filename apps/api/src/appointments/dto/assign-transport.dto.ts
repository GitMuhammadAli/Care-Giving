import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignTransportDto {
  @ApiProperty({ description: 'ID of the family member assigned to provide transport', format: 'uuid' })
  @IsString()
  assignedToId: string;

  @ApiPropertyOptional({ description: 'Additional notes about transport arrangement', example: 'Will pick up at 8:30 AM' })
  @IsOptional()
  @IsString()
  notes?: string;
}
