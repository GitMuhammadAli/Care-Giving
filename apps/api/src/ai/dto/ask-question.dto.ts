import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AskQuestionDto {
  @ApiProperty({
    description: 'Natural language question about care history',
    example: 'How has medication adherence been this week?',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty({ message: 'Question is required' })
  @MaxLength(500, { message: 'Question must be under 500 characters' })
  question: string;

  @ApiProperty({
    description: 'ID of the care recipient to query about',
    example: 'cr_abc123',
  })
  @IsString()
  @IsNotEmpty({ message: 'Care recipient ID is required' })
  careRecipientId: string;
}
