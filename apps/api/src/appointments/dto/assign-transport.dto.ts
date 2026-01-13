import { IsString, IsOptional } from 'class-validator';

export class AssignTransportDto {
  @IsString()
  assigneeId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

