import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { DocumentType } from '@prisma/client';

// TypeORM entity category enum for backward compatibility
export enum DocumentCategory {
  MEDICAL = 'medical',
  INSURANCE = 'insurance',
  LEGAL = 'legal',
  IDENTIFICATION = 'identification',
  FINANCIAL = 'financial',
  OTHER = 'other',
}

export class UploadDocumentDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(DocumentType)
  @IsOptional()
  type?: DocumentType;

  @IsEnum(DocumentCategory)
  @IsOptional()
  category?: DocumentCategory;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsDateString()
  @IsOptional()
  expirationDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
