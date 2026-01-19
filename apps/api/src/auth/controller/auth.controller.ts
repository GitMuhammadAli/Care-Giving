import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Res,
  Req,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { ConfigService } from '@nestjs/config';

import { AuthService } from '../service/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { VerifyEmailDto, ResendVerificationDto } from '../dto/verify-email.dto';
import { ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto } from '../dto/password-reset.dto';
import {
  LoginResponseDto,
  RegisterResponseDto,
  VerifyEmailResponseDto,
  MessageResponseDto,
  ErrorResponseDto,
  AuthUserDto,
  TokensDto,
} from '../dto/auth-response.dto';

import { Public } from '../../system/decorator/public.decorator';
import { JwtAuthGuard } from '../../system/guard/jwt-auth.guard';
import { GetUser } from '../../system/decorator/current-user.decorator';
import { CurrentUser } from '../../system/helper/context.helper';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly isProduction: boolean;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    const appConfig = this.configService.get('app');
    this.isProduction = appConfig?.isProduction ?? false;
  }

  @Post('register')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Creates a new user account. An email verification OTP will be sent to the provided email.',
  })
  @ApiResponse({ status: 201, description: 'User registered successfully', type: RegisterResponseDto })
  @ApiResponse({ status: 409, description: 'Email already registered', type: ErrorResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error', type: ErrorResponseDto })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('verify-email')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Verify email with OTP',
    description: 'Verifies user email with the 6-digit OTP sent during registration. Returns tokens for automatic login.',
  })
  @ApiResponse({ status: 200, description: 'Email verified successfully', type: VerifyEmailResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'User not found', type: ErrorResponseDto })
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.email, dto.otp);
  }

  @Post('resend-verification')
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Resend email verification OTP' })
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Post('login')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Login with email and password',
    description: `
Authenticates user and returns JWT tokens.

**How to use the token:**
1. Copy the \`accessToken\` from the response
2. Click the **Authorize** button (🔓) at the top of this page
3. Paste the token in the input field
4. Click **Authorize**

Now all protected endpoints will use this token automatically.

**Token expiration:**
- Access token: 15 minutes
- Refresh token: 7 days (30 days with rememberMe)
    `,
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful - copy the accessToken and use Authorize button',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials', type: ErrorResponseDto })
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res() res: Response) {
    const result = await this.authService.login(dto);
    this.setTokenCookies(res, result.tokens, dto.rememberMe);
    return res.json(result);
  }

  @Post('refresh')
  @Public()
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Get a new access token using a valid refresh token. Use this when your access token expires.',
  })
  @ApiResponse({ status: 200, description: 'New tokens generated', type: TokensDto })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token', type: ErrorResponseDto })
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request, @Res() res: Response) {
    const refreshToken = dto.refreshToken || req.cookies?.['refresh_token'];
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    const tokens = await this.authService.refreshToken(refreshToken);
    this.setTokenCookies(res, tokens);
    return res.json(tokens);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout current session' })
  @ApiResponse({ status: 200, description: 'Logged out successfully', type: MessageResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto })
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: RefreshTokenDto, @Req() req: Request, @Res() res: Response) {
    const refreshToken = dto.refreshToken || req.cookies?.['refresh_token'];
    
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    this.clearTokenCookies(res);
    return res.json({ message: 'Logged out successfully' });
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiResponse({ status: 200, description: 'Logged out from all devices', type: MessageResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto })
  @HttpCode(HttpStatus.OK)
  async logoutAll(@GetUser() user: CurrentUser, @Res() res: Response) {
    await this.authService.logoutAll(user.id);
    this.clearTokenCookies(res);
    return res.json({ message: 'Logged out from all devices' });
  }

  @Post('forgot-password')
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Request password reset' })
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Reset password with token' })
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Change password (authenticated)' })
  @ApiResponse({ status: 200, description: 'Password changed successfully', type: MessageResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid current password or unauthorized', type: ErrorResponseDto })
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @GetUser() user: CurrentUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword);
    return { message: 'Password changed successfully' };
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get active sessions' })
  @ApiResponse({ status: 200, description: 'List of active sessions' })
  @ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto })
  async getSessions(@GetUser() user: CurrentUser) {
    return this.authService.getSessions(user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Returns the authenticated user\'s profile including family memberships. Requires valid JWT token.',
  })
  @ApiResponse({ status: 200, description: 'User profile', type: AuthUserDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing token', type: ErrorResponseDto })
  async getProfile(@GetUser() user: CurrentUser) {
    return this.authService.getProfile(user.id);
  }

  @Post('complete-onboarding')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Mark onboarding as completed' })
  @ApiResponse({ status: 200, description: 'Onboarding completed', type: MessageResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto })
  @HttpCode(HttpStatus.OK)
  async completeOnboarding(@GetUser() user: CurrentUser) {
    return this.authService.completeOnboarding(user.id);
  }

  private setTokenCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
    rememberMe = false,
  ): void {
    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'strict',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
    });
  }

  private clearTokenCookies(res: Response): void {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
  }
}

