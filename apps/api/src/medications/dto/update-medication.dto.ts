import { PartialType } from '@nestjs/mapped-types';
import { CreateMedicationDto } from './create-medication.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateMedicationDto extends PartialType(CreateMedicationDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
