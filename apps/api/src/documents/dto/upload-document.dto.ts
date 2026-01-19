import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '@prisma/client';

// Document category enum
export enum DocumentCategory {
  MEDICAL = 'medical',
  INSURANCE = 'insurance',
  LEGAL = 'legal',
  IDENTIFICATION = 'identification',
  FINANCIAL = 'financial',
  OTHER = 'other',
}

export class UploadDocumentDto {
  @ApiPropertyOptional({ description: 'File name (uses uploaded filename if not provided)' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Document title', example: 'Insurance Card' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Document type',
    enum: DocumentType,
    example: 'INSURANCE',
  })
  @IsEnum(DocumentType)
  @IsOptional()
  type?: DocumentType;

  @ApiPropertyOptional({
    description: 'Document category for organization',
    enum: DocumentCategory,
    example: DocumentCategory.INSURANCE,
  })
  @IsEnum(DocumentCategory)
  @IsOptional()
  category?: DocumentCategory;

  @ApiPropertyOptional({ description: 'Document description', example: 'Front and back of insurance card' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Document expiration date', example: '2025-12-31' })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Alternative expiration date field', example: '2025-12-31' })
  @IsDateString()
  @IsOptional()
  expirationDate?: string;

  @ApiPropertyOptional({ description: 'Additional notes', example: 'Policy number: ABC123' })
  @IsString()
  @IsOptional()
  notes?: string;
}
