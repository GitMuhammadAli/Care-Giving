import { IsEnum } from 'class-validator';

export class UpdateMemberRoleDto {
  @IsEnum(['ADMIN', 'CAREGIVER', 'VIEWER'])
  role: 'ADMIN' | 'CAREGIVER' | 'VIEWER';
}

