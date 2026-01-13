import { IsDateString, IsNotEmpty, IsUUID, IsOptional, IsString } from 'class-validator';

export class CreateShiftDto {
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @IsUUID()
  @IsNotEmpty()
  caregiverId: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
