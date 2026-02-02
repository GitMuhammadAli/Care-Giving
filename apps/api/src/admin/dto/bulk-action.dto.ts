import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsString, IsEnum, ArrayMinSize, IsOptional } from 'class-validator';

export enum BulkUserAction {
  SUSPEND = 'SUSPEND',
  ACTIVATE = 'ACTIVATE',
  DELETE = 'DELETE',
  RESET_PASSWORD = 'RESET_PASSWORD',
}

export enum BulkFamilyAction {
  DELETE = 'DELETE',
}

export class BulkUserActionDto {
  @ApiProperty({ description: 'Array of user IDs to perform action on' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  userIds: string[];

  @ApiProperty({ description: 'Action to perform', enum: BulkUserAction })
  @IsEnum(BulkUserAction)
  action: BulkUserAction;

  @ApiPropertyOptional({ description: 'Reason for the action (for audit log)' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class BulkFamilyActionDto {
  @ApiProperty({ description: 'Array of family IDs to perform action on' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  familyIds: string[];

  @ApiProperty({ description: 'Action to perform', enum: BulkFamilyAction })
  @IsEnum(BulkFamilyAction)
  action: BulkFamilyAction;

  @ApiPropertyOptional({ description: 'Reason for the action (for audit log)' })
  @IsOptional()
  @IsString()
  reason?: string;
}

