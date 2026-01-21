import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Token response for authentication
 */
export class TokensDto {
  @ApiProperty({
    description: 'JWT access token - use this in the Authorization header as "Bearer <token>"',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLWlkIiwiZW1haWwiOiJqb2huQGV4YW1wbGUuY29tIiwiaWF0IjoxNzA1MzQyMDAwfQ.signature',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Refresh token for obtaining new access tokens',
    example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0',
  })
  refreshToken: string;
}

/**
 * User profile in auth responses
 */
export class AuthUserDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  fullName: string;

  @ApiPropertyOptional({ example: '+15551234567' })
  phone?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  avatarUrl?: string;

  @ApiProperty({ example: 'ACTIVE', enum: ['PENDING', 'ACTIVE', 'SUSPENDED'] })
  status: string;

  @ApiProperty({ example: true })
  emailVerified: boolean;

  @ApiProperty({ example: false })
  onboardingCompleted: boolean;

  @ApiProperty({
    description: 'User family memberships',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174001' },
        name: { type: 'string', example: 'Smith Family' },
        role: { type: 'string', example: 'ADMIN', enum: ['ADMIN', 'CAREGIVER', 'VIEWER'] },
        careRecipients: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              fullName: { type: 'string' },
              preferredName: { type: 'string' },
            },
          },
        },
      },
    },
  })
  families: any[];
}

/**
 * Login response
 */
export class LoginResponseDto {
  @ApiProperty({ type: TokensDto, description: 'JWT tokens (used internally for cookie setting)' })
  tokens: TokensDto;

  @ApiProperty({
    description: 'JWT access token - use this in the Authorization header as "Bearer <token>"',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}

/**
 * Register response
 */
export class RegisterResponseDto {
  @ApiProperty({ example: 'Registration successful. Please check your email to verify your account.' })
  message: string;

  @ApiProperty({
    type: 'object',
    properties: {
      email: { type: 'string', example: 'john@example.com' },
      fullName: { type: 'string', example: 'John Doe' },
    },
  })
  user: {
    email: string;
    fullName: string;
  };
}

/**
 * Email verification response
 */
export class VerifyEmailResponseDto {
  @ApiProperty({ example: 'Email verified successfully' })
  message: string;

  @ApiProperty({ type: TokensDto, description: 'JWT tokens (used internally for cookie setting)' })
  tokens: TokensDto;

  @ApiProperty({
    description: 'JWT access token - use this in the Authorization header as "Bearer <token>"',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}

/**
 * Generic success response
 */
export class MessageResponseDto {
  @ApiProperty({ example: 'Operation completed successfully' })
  message: string;
}

/**
 * Error response
 */
export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'Bad Request' })
  error: string;

  @ApiProperty({ example: 'Invalid email or password' })
  message: string;

  @ApiProperty({ example: '2024-01-15T12:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/api/v1/auth/login' })
  path: string;
}

