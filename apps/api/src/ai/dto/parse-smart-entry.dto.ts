import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ParseSmartEntryDto {
  @ApiProperty({
    description: 'Natural language text to parse into a structured timeline entry',
    example: 'Mom had breakfast at 8am, blood pressure 130/85, seemed tired',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty({ message: 'Text is required' })
  @MaxLength(2000, { message: 'Text must be under 2000 characters' })
  text: string;
}
