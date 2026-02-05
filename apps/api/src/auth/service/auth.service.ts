import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
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
import { AuthEvent } from '@prisma/client';
import { AUTH_MESSAGES } from '../../common/messages';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
    private cacheService: CacheService,
  ) {}

  /**
   * Log authentication event to database
   */
  private async logAuthEvent(
    event: AuthEvent,
    email: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.authLog.create({
        data: {
          event,
          email: email.toLowerCase(),
          userId,
          ipAddress,
          userAgent,
          metadata: metadata as any,
        },
      });
    } catch (error) {
      // Don't fail auth operations due to logging issues
      this.logger.warn(`Failed to log auth event: ${error.message}`);
    }
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException(AUTH_MESSAGES.EMAIL_ALREADY_EXISTS);
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
        status: 'PENDING',
        emailVerified: false,
        emailVerificationCode: otp,
        emailVerificationExpiresAt: otpExpiresAt,
      },
    });

    // Send verification email with proper error handling
    try {
      await this.mailService.sendEmailVerification(
        user.email,
        otp,
        user.fullName,
      );
      this.logger.log(`Verification email sent to: ${user.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${user.email}: ${error.message}`,
        error.stack
      );
      // Don't fail registration if email fails - user can request resend
    }

    // Log audit and auth event
    await this.logAudit(user.id, 'REGISTER', 'user', user.id);
    await this.logAuthEvent(AuthEvent.REGISTER, user.email, user.id);

    return {
      message: AUTH_MESSAGES.REGISTER_SUCCESS,
      user: {
        email: user.email,
        fullName: user.fullName,
      },
    };
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      // Log failed login attempt
      await this.logAuthEvent(
        AuthEvent.LOGIN_FAILED, 
        dto.email, 
        undefined, 
        ipAddress, 
        userAgent,
        { reason: 'user_not_found' }
      );
      // Security: Don't reveal if email exists, but provide helpful guidance
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

    if (user.status !== 'ACTIVE') {
      await this.logAuthEvent(
        AuthEvent.LOGIN_FAILED, 
        dto.email, 
        user.id, 
        ipAddress, 
        userAgent,
        { reason: 'account_not_active', status: user.status }
      );
      throw new UnauthorizedException(AUTH_MESSAGES.ACCOUNT_NOT_ACTIVE);
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      await this.logAuthEvent(
        AuthEvent.LOGIN_FAILED, 
        dto.email, 
        user.id, 
        ipAddress, 
        userAgent,
        { reason: 'invalid_password' }
      );
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_PASSWORD);
    }

    const tokens = await this.generateTokens(user.id, user.email);
    await this.createSession(user.id, tokens.refreshToken);

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Log audit and auth event
    await this.logAudit(user.id, 'LOGIN', 'user', user.id);
    await this.logAuthEvent(
      AuthEvent.LOGIN_SUCCESS, 
      user.email, 
      user.id, 
      ipAddress, 
      userAgent
    );

    // Fetch user with family memberships for complete response
    const userWithFamilies = await this.prisma.user.findUnique({
      where: { id: user.id },
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

    return {
      tokens, // Used by controller to set httpOnly cookie
      accessToken: tokens.accessToken, // Returned to frontend
      user: this.sanitizeUser(userWithFamilies),
    };
  }

  async refreshToken(refreshToken: string) {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || !session.isActive || session.expiresAt < new Date()) {
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_REFRESH_TOKEN);
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

    return { message: AUTH_MESSAGES.LOGOUT_SUCCESS };
  }

  async logoutAll(userId: string) {
    await this.prisma.session.updateMany({
      where: { userId },
      data: { isActive: false },
    });

    await this.logAudit(userId, 'LOGOUT_ALL', 'user', userId);

    return { message: AUTH_MESSAGES.LOGOUT_ALL_SUCCESS };
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email.toLowerCase();
    this.logger.log(`Password reset requested for: ${normalizedEmail}`);

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Don't reveal if email exists (security best practice)
    const successMessage = AUTH_MESSAGES.PASSWORD_RESET_EMAIL_SENT;
    
    if (!user) {
      this.logger.debug(`Password reset requested for non-existent email: ${normalizedEmail}`);
      return { message: successMessage };
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

    // Log auth event
    await this.logAuthEvent(AuthEvent.PASSWORD_RESET_REQUEST, user.email, user.id);

    // Send password reset email with proper error handling
    try {
      await this.mailService.sendPasswordReset(user.email, token, user.fullName);
      this.logger.log(`Password reset email sent successfully to: ${user.email}`);
    } catch (error) {
      // Log the error but don't reveal to user (security)
      this.logger.error(
        `Failed to send password reset email to ${user.email}: ${error.message}`,
        error.stack
      );
      // Still return success message for security - don't let attackers know if email failed
    }

    return { message: successMessage };
  }

  async verifyResetToken(token: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        fullName: true,
      },
    });

    if (!user) {
      throw new BadRequestException(AUTH_MESSAGES.RESET_TOKEN_INVALID);
    }

    // Return minimal info - just enough to show the user's masked email
    const maskedEmail = this.maskEmail(user.email);
    return {
      valid: true,
      email: maskedEmail,
    };
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (local.length <= 2) {
      return `${local[0]}***@${domain}`;
    }
    return `${local[0]}${local[1]}***@${domain}`;
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException(AUTH_MESSAGES.RESET_TOKEN_INVALID);
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
    await this.logAuthEvent(AuthEvent.PASSWORD_RESET_SUCCESS, user.email, user.id);

    return { message: AUTH_MESSAGES.PASSWORD_RESET_SUCCESS };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(AUTH_MESSAGES.USER_NOT_FOUND);
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException(AUTH_MESSAGES.CURRENT_PASSWORD_INCORRECT);
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

    return { message: AUTH_MESSAGES.PASSWORD_CHANGE_SUCCESS };
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
    console.log('getProfile called for user:', userId, 'cacheKey:', cacheKey);

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        console.log('getProfile - Cache MISS, fetching from database for user:', userId);
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

  async updateProfile(userId: string, dto: { fullName?: string; phone?: string; timezone?: string; avatarUrl?: string }) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        timezone: dto.timezone,
        avatarUrl: dto.avatarUrl,
      },
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

    // Invalidate user cache
    await this.invalidateUserCache(userId);

    await this.logAudit(userId, 'PROFILE_UPDATE', 'user', userId);

    return this.sanitizeUser(user);
  }

  /**
   * Invalidate user profile cache
   * Call this when user data changes
   * Returns a message for API response
   */
  async invalidateUserCache(userId: string): Promise<{ message: string }> {
    await this.cacheService.del([
      CACHE_KEYS.USER_PROFILE(userId),
      CACHE_KEYS.USER_FAMILIES(userId),
    ]);
    // Also use pattern-based invalidation for thorough cleanup
    await this.cacheService.delPattern(`user:*${userId}*`);
    console.log(`Invalidated all cache for user: ${userId}`);
    return { message: 'Cache invalidated successfully' };
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
      throw new NotFoundException(AUTH_MESSAGES.USER_NOT_FOUND);
    }

    if (user.emailVerified) {
      throw new BadRequestException(AUTH_MESSAGES.EMAIL_ALREADY_VERIFIED);
    }

    if (!user.emailVerificationCode || !user.emailVerificationExpiresAt) {
      throw new BadRequestException(AUTH_MESSAGES.VERIFICATION_CODE_NOT_FOUND);
    }

    if (user.emailVerificationExpiresAt < new Date()) {
      throw new BadRequestException(AUTH_MESSAGES.VERIFICATION_CODE_EXPIRED);
    }

    if (user.emailVerificationCode !== otp) {
      throw new BadRequestException(AUTH_MESSAGES.VERIFICATION_CODE_INVALID);
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

    // Fetch user with family memberships (new users won't have any, but keep consistent)
    const userWithFamilies = await this.prisma.user.findUnique({
      where: { id: user.id },
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

    return {
      message: AUTH_MESSAGES.EMAIL_VERIFIED_SUCCESS,
      tokens, // Used by controller to set httpOnly cookie
      accessToken: tokens.accessToken, // Returned to frontend
      user: this.sanitizeUser(userWithFamilies),
    };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if email exists
      return { message: AUTH_MESSAGES.VERIFICATION_CODE_SENT_IF_EXISTS };
    }

    if (user.emailVerified) {
      throw new BadRequestException(AUTH_MESSAGES.EMAIL_ALREADY_VERIFIED);
    }

    const now = new Date();
    const rateLimitWindow = 60 * 1000; // 60 seconds - minimum time between requests
    const codeValidityWindow = 5 * 60 * 1000; // 5 minutes - how long code stays valid

    // Check rate limiting - prevent spam
    if (user.emailVerificationCode && user.emailVerificationExpiresAt) {
      const codeCreatedAt = new Date(user.emailVerificationExpiresAt.getTime() - codeValidityWindow);
      const timeSinceLastCode = now.getTime() - codeCreatedAt.getTime();

      // If code was sent less than 60 seconds ago, reject the request
      if (timeSinceLastCode < rateLimitWindow) {
        const waitSeconds = Math.ceil((rateLimitWindow - timeSinceLastCode) / 1000);
        throw new BadRequestException(
          `Please wait ${waitSeconds} seconds before requesting a new code`
        );
      }
    }

    // Always generate a fresh 6-digit OTP (overwrites any existing code)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + codeValidityWindow);

    // Update database - this overwrites any previous code
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationCode: otp,
        emailVerificationExpiresAt: otpExpiresAt,
      },
    });

    // Send verification email with the new code
    await this.mailService.sendEmailVerification(
      user.email,
      otp,
      user.fullName,
    );

    return { message: AUTH_MESSAGES.VERIFICATION_CODE_SENT };
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

    return { message: AUTH_MESSAGES.ONBOARDING_COMPLETED };
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
