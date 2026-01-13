import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as argon2 from 'argon2';
import * as jose from 'jose';
import { v4 as uuid } from 'uuid';

@Injectable()
export class AuthService {
  private jwtSecret: Uint8Array;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.jwtSecret = new TextEncoder().encode(
      this.config.get('JWT_SECRET') || 'dev-secret-change-in-production-min-32-chars',
    );
  }

  async register(dto: RegisterDto, deviceInfo?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        timezone: dto.timezone || 'America/New_York',
      },
    });

    const tokens = await this.generateTokens(user.id, user.email);
    await this.createSession(user.id, tokens.refreshToken, deviceInfo);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        timezone: user.timezone,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto, deviceInfo?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 1000 / 60,
      );
      throw new ForbiddenException(
        `Account locked. Try again in ${remainingMinutes} minutes.`,
      );
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);

    if (!valid) {
      await this.handleFailedLogin(user.id, user.failedLoginAttempts);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed attempts on successful login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    const tokens = await this.generateTokens(user.id, user.email);
    await this.createSession(user.id, tokens.refreshToken, deviceInfo);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        timezone: user.timezone,
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokens = await this.generateTokens(session.user.id, session.user.email);

    // Rotate refresh token
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return tokens;
  }

  async logout(refreshToken: string) {
    await this.prisma.session.deleteMany({
      where: { refreshToken },
    });
  }

  async logoutAll(userId: string) {
    await this.prisma.session.deleteMany({
      where: { userId },
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        timezone: true,
        avatarUrl: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: true,
      },
    });

    return user;
  }

  private async generateTokens(userId: string, email: string) {
    const accessToken = await new jose.SignJWT({ sub: userId, email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(this.jwtSecret);

    const refreshToken = uuid();

    return { accessToken, refreshToken };
  }

  private async createSession(userId: string, refreshToken: string, deviceInfo?: string) {
    await this.prisma.session.create({
      data: {
        userId,
        refreshToken,
        deviceInfo,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });
  }

  private async handleFailedLogin(userId: string, currentAttempts: number) {
    const attempts = currentAttempts + 1;
    const data: { failedLoginAttempts: number; lockedUntil?: Date } = {
      failedLoginAttempts: attempts,
    };

    // Lock after 5 failed attempts
    if (attempts >= 5) {
      data.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    }

    await this.prisma.user.update({ where: { id: userId }, data });
  }

  async validateToken(token: string) {
    try {
      const { payload } = await jose.jwtVerify(token, this.jwtSecret);
      return { userId: payload.sub as string, email: payload.email as string };
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}

