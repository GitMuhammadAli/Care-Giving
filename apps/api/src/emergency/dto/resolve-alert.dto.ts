import { IsOptional, IsString } from 'class-validator';

export class ResolveAlertDto {
  @IsString()
  @IsOptional()
  resolutionNotes?: string;
}
