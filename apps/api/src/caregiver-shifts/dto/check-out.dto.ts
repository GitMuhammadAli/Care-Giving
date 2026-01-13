import { IsOptional, IsString } from 'class-validator';

export class CheckOutDto {
  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  handoffNotes?: string;
}
