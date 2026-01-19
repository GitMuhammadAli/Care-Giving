import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../system/module/mail/mail.service';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../../system/module/cache';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
    private cacheService: CacheService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        status: 'PENDING', // User must verify email first
        emailVerified: false,
        emailVerificationCode: otp,
        emailVerificationExpiresAt: otpExpiresAt,
      },
    });

    // Send verification email
    await this.mailService.sendEmailVerification(
      user.email,
      otp,
      user.fullName,
    );

    // Log audit
    await this.logAudit(user.id, 'REGISTER', 'user', user.id);

    return {
      message: 'Registration successful. Please check your email to verify your account.',
      user: {
        email: user.email,
        fullName: user.fullName,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      // Security: Don't reveal if email exists, but provide helpful guidance
      throw new UnauthorizedException(
        'Invalid email or password. If you don\'t have an account, please register first.'
      );
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        'Account is not active. Please check your email to verify your account.'
      );
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException(
        'Invalid email or password. Please check your credentials and try again.'
      );
    }

    const tokens = await this.generateTokens(user.id, user.email);
    await this.createSession(user.id, tokens.refreshToken);

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Log audit
    await this.logAudit(user.id, 'LOGIN', 'user', user.id);

    return {
      tokens,
      user: this.sanitizeUser(user),
    };
  }

  async refreshToken(refreshToken: string) {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || !session.isActive || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(session.user.id, session.user.email);

    // Update session with new refresh token
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lastUsedAt: new Date(),
      },
    });

    return tokens;
  }

  async logout(refreshToken: string) {
    await this.prisma.session.updateMany({
      where: { refreshToken },
      data: { isActive: false },
    });

    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string) {
    await this.prisma.session.updateMany({
      where: { userId },
      data: { isActive: false },
    });

    await this.logAudit(userId, 'LOGOUT_ALL', 'user', userId);

    return { message: 'Logged out from all devices' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Don't reveal if email exists (security best practice)
    if (!user) {
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpiresAt: expiresAt,
      },
    });

    // Send password reset email
    await this.mailService.sendPasswordReset(user.email, token, user.fullName);

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        passwordChangedAt: new Date(),
      },
    });

    // Invalidate all sessions
    await this.prisma.session.updateMany({
      where: { userId: user.id },
      data: { isActive: false },
    });

    // Invalidate user cache
    await this.invalidateUserCache(user.id);

    await this.logAudit(user.id, 'PASSWORD_RESET', 'user', user.id);

    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
      },
    });

    // Invalidate user cache
    await this.invalidateUserCache(userId);

    await this.logAudit(userId, 'PASSWORD_CHANGE', 'user', userId);

    return { message: 'Password changed successfully' };
  }

  async getSessions(userId: string) {
    return this.prisma.session.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  async getProfile(userId: string) {
    const cacheKey = CACHE_KEYS.USER_PROFILE(userId);

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          include: {
            familyMemberships: {
              include: {
                family: {
                  include: {
                    careRecipients: {
                      select: {
                        id: true,
                        fullName: true,
                        preferredName: true,
                        dateOfBirth: true,
                        photoUrl: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (!user) {
          throw new NotFoundException('User not found');
        }

        return this.sanitizeUser(user);
      },
      CACHE_TTL.USER_PROFILE,
    );
  }

  /**
   * Invalidate user profile cache
   * Call this when user data changes
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await this.cacheService.del([
      CACHE_KEYS.USER_PROFILE(userId),
      CACHE_KEYS.USER_FAMILIES(userId),
    ]);
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status !== 'ACTIVE') {
      return null;
    }

    return this.sanitizeUser(user);
  }

  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      return this.validateUser(payload.sub);
    } catch {
      return null;
    }
  }

  async verifyEmail(email: string, otp: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    if (!user.emailVerificationCode || !user.emailVerificationExpiresAt) {
      throw new BadRequestException('No verification code found. Please request a new one.');
    }

    if (user.emailVerificationExpiresAt < new Date()) {
      throw new BadRequestException('Verification code has expired. Please request a new one.');
    }

    if (user.emailVerificationCode !== otp) {
      throw new BadRequestException('Invalid verification code');
    }

    // Verify the email and activate the user
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        status: 'ACTIVE',
        emailVerificationCode: null,
        emailVerificationExpiresAt: null,
      },
    });

    // Invalidate user cache (status changed)
    await this.invalidateUserCache(user.id);

    // Generate tokens for automatic login
    const tokens = await this.generateTokens(user.id, user.email);
    await this.createSession(user.id, tokens.refreshToken);

    // Log audit
    await this.logAudit(user.id, 'EMAIL_VERIFIED', 'user', user.id);

    return {
      message: 'Email verified successfully',
      tokens,
      user: this.sanitizeUser({
        ...user,
        emailVerified: true,
        status: 'ACTIVE',
      }),
    };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if email exists
      return { message: 'If the email exists, a verification code has been sent' };
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Generate new 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationCode: otp,
        emailVerificationExpiresAt: otpExpiresAt,
      },
    });

    // Send verification email
    await this.mailService.sendEmailVerification(
      user.email,
      otp,
      user.fullName,
    );

    return { message: 'Verification code sent successfully' };
  }

  async completeOnboarding(userId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      },
    });

    await this.logAudit(userId, 'COMPLETE_ONBOARDING', 'user', userId);

    return { message: 'Onboarding completed successfully' };
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('jwt.expiresIn') || '15m',
    });

    const refreshToken = randomBytes(32).toString('hex');

    return { accessToken, refreshToken };
  }

  private async createSession(userId: string, refreshToken: string, deviceInfo?: string) {
    await this.prisma.session.create({
      data: {
        userId,
        refreshToken,
        deviceInfo,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  private async logAudit(userId: string, action: string, resource: string, resourceId: string) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
      },
    });
  }

  private sanitizeUser(user: any) {
    const {
      passwordHash,
      passwordResetToken,
      passwordResetExpiresAt,
      familyMemberships,
      ...sanitized
    } = user;

    // Transform familyMemberships into families array for frontend compatibility
    const families = familyMemberships?.map((membership: any) => ({
      id: membership.family.id,
      name: membership.family.name,
      role: membership.role,
      careRecipients: membership.family.careRecipients || [],
    })) || [];

    console.log('Auth Service - sanitizeUser:', {
      userId: user.id,
      hasFamilyMemberships: !!familyMemberships,
      membershipCount: familyMemberships?.length || 0,
      families: families,
    });

    return {
      ...sanitized,
      families,
    };
  }
}
