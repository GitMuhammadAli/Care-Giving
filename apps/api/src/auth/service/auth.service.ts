import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { addSeconds, addDays } from 'date-fns';

import { User, UserStatus } from '../../user/entity/user.entity';
import { UserRepository } from '../../user/repository/user.repository';
import { SessionRepository } from '../../user/repository/session.repository';
import { OtpHelper } from '../../system/helper/otp.helper';
import { ContextHelper } from '../../system/helper/context.helper';
import { MailService } from '../../system/module/mail/mail.service';

import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';

// Audit action types for logging
enum AuditAction {
  CREATE = 'CREATE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  FAILED_LOGIN = 'FAILED_LOGIN',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthResponse {
  user: Partial<User>;
  tokens: TokenPair;
}

@Injectable()
export class AuthService {
  private readonly maxLoginAttempts: number;
  private readonly lockoutDuration: number;

  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    private userRepository: UserRepository,
    private sessionRepository: SessionRepository,
    private otpHelper: OtpHelper,
    private mailService: MailService,
  ) {
    this.maxLoginAttempts = this.configService.get('security.maxLoginAttempts') || 5;
    this.lockoutDuration = this.configService.get('security.lockoutDuration') || 1800;
  }

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const user = await this.userRepository.createUser({
      ...dto,
      status: UserStatus.PENDING,
      emailVerified: false,
    });

    // Generate and send verification OTP
    const otp = await this.otpHelper.generate(user.email, 'email-verification');
    await this.mailService.sendEmailVerification(user.email, otp, user.fullName);

    await this.logAudit(AuditAction.CREATE, 'User', user.id);

    return {
      message: 'Registration successful. Please check your email to verify your account.',
    };
  }

  async verifyEmail(email: string, otp: string): Promise<AuthResponse> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Invalid email or OTP');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    const isValid = await this.otpHelper.verify(email, 'email-verification', otp);
    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    await this.userRepository.verifyEmail(user.id);

    const tokens = await this.generateTokens(user);
    await this.createSession(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return { message: 'If the email exists, a verification code will be sent.' };
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    const otp = await this.otpHelper.generate(email, 'email-verification');
    await this.mailService.sendEmailVerification(email, otp, user.fullName);

    return { message: 'If the email exists, a verification code will be sent.' };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.userRepository.findByEmail(dto.email);

    if (!user) {
      await this.logAudit(AuditAction.FAILED_LOGIN, 'User', undefined, { email: dto.email });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.isLocked()) {
      throw new ForbiddenException('Account is temporarily locked. Please try again later.');
    }

    // Validate password
    const isPasswordValid = await user.validatePassword(dto.password);
    if (!isPasswordValid) {
      await this.handleFailedLogin(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check account status
    if (user.status === UserStatus.PENDING) {
      throw new ForbiddenException('Please verify your email before logging in');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('Account is suspended');
    }

    if (user.status === UserStatus.DEACTIVATED) {
      throw new ForbiddenException('Account is deactivated');
    }

    // Reset failed attempts on successful login
    await this.userRepository.resetFailedAttempts(user.id);
    await this.userRepository.updateLastLogin(user.id);

    const tokens = await this.generateTokens(user, dto.rememberMe);
    await this.createSession(user.id, tokens.refreshToken, dto.rememberMe);

    await this.logAudit(AuditAction.LOGIN, 'User', user.id);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    const session = await this.sessionRepository.findByRefreshToken(refreshToken);

    if (!session || !session.isActive || session.isExpired()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = session.user;

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Generate new tokens (token rotation for security)
    const newTokens = await this.generateTokens(user);

    // Update session with new refresh token (token rotation)
    await this.sessionRepository.updateRefreshToken(session.id, newTokens.refreshToken);
    await this.sessionRepository.updateLastUsed(session.id);

    return newTokens;
  }

  async logout(refreshToken: string): Promise<void> {
    await this.sessionRepository.invalidateSession(refreshToken);

    const userId = ContextHelper.getUserId();
    if (userId) {
      await this.logAudit(AuditAction.LOGOUT, 'User', userId);
    }
  }

  async logoutAll(): Promise<void> {
    const userId = ContextHelper.getUserId();
    if (userId) {
      await this.sessionRepository.invalidateAllUserSessions(userId);
      await this.logAudit(AuditAction.LOGOUT, 'User', userId, { allDevices: true });
    }
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.userRepository.findByEmail(email);

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If the email exists, a password reset link will be sent.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = addSeconds(new Date(), 3600); // 1 hour

    await this.userRepository.setPasswordResetToken(user.id, hashedToken, expiresAt);
    await this.mailService.sendPasswordReset(email, token, user.fullName);

    return { message: 'If the email exists, a password reset link will be sent.' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.userRepository.findOne({
      where: {
        passwordResetToken: hashedToken,
      },
    });

    if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Update password
    user.password = newPassword;
    await user.hashPassword();
    user.passwordChangedAt = new Date();
    user.passwordResetToken = null as any;
    user.passwordResetExpiresAt = null as any;

    await this.userRepository.save(user);

    // Invalidate all sessions
    await this.sessionRepository.invalidateAllUserSessions(user.id);

    await this.logAudit(AuditAction.PASSWORD_CHANGE, 'User', user.id);

    return { message: 'Password reset successful. Please login with your new password.' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isValid = await user.validatePassword(currentPassword);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    user.password = newPassword;
    await user.hashPassword();
    user.passwordChangedAt = new Date();

    await this.userRepository.save(user);

    // Invalidate all sessions except current
    const currentToken = ContextHelper.getCls().get('refreshToken');
    if (currentToken) {
      await this.sessionRepository.invalidateAllExceptCurrent(userId, currentToken);
    }

    await this.logAudit(AuditAction.PASSWORD_CHANGE, 'User', userId);
  }

  async getSessions(userId: string) {
    return this.sessionRepository.findActiveByUserId(userId);
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findByIdWithFamilies(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Transform familyMemberships to families array for frontend
    const userWithFamilies = this.sanitizeUser(user);
    
    // Map familyMemberships to a cleaner families structure
    if (user.familyMemberships && user.familyMemberships.length > 0) {
      (userWithFamilies as any).families = user.familyMemberships.map((membership: any) => ({
        id: membership.family.id,
        name: membership.family.name,
        role: membership.role,
        careRecipients: membership.family.careRecipients || [],
      }));
    } else {
      (userWithFamilies as any).families = [];
    }

    return userWithFamilies;
  }

  private async generateTokens(user: User, rememberMe = false): Promise<TokenPair> {
    const payload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(
      { ...payload, type: 'access' },
      {
        secret: this.configService.get('jwt.secret'),
        expiresIn: this.configService.get('jwt.expiresIn') || '15m',
      },
    );

    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      {
        secret: this.configService.get('jwt.refreshSecret'),
        expiresIn: rememberMe ? '30d' : (this.configService.get('jwt.refreshExpiresIn') || '7d'),
      },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  private async createSession(userId: string, refreshToken: string, rememberMe = false): Promise<void> {
    const ip = ContextHelper.getIp();
    const expiresAt = rememberMe ? addDays(new Date(), 30) : addDays(new Date(), 7);

    await this.sessionRepository.createSession({
      userId,
      refreshToken,
      expiresAt,
      ipAddress: ip,
      isActive: true,
      lastUsedAt: new Date(),
    });
  }

  private async handleFailedLogin(user: User): Promise<void> {
    await this.userRepository.incrementFailedAttempts(user.id);

    const attempts = user.failedLoginAttempts + 1;

    if (attempts >= this.maxLoginAttempts) {
      const lockUntil = addSeconds(new Date(), this.lockoutDuration);
      await this.userRepository.lockUser(user.id, lockUntil);
    }

    await this.logAudit(AuditAction.FAILED_LOGIN, 'User', user.id, { attempts });
  }

  private sanitizeUser(user: User): Partial<User> {
    const { password, passwordResetToken, ...sanitized } = user;
    return sanitized;
  }

  private async logAudit(
    action: AuditAction,
    entityType: string,
    entityId?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    // TODO: Re-enable audit logging when audit_logs table is added to Prisma schema
    // For now, just log to console
    console.log(`[Audit] ${action} on ${entityType}${entityId ? ` (${entityId})` : ''}`);
  }
}

