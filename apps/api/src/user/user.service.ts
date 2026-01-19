import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async updateProfile(userId: string, dto: {
    fullName?: string;
    phone?: string;
    timezone?: string;
    avatarUrl?: string;
    preferences?: any;
  }) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        timezone: dto.timezone,
        avatarUrl: dto.avatarUrl,
        preferences: dto.preferences,
      },
    });

    return this.sanitizeUser(user);
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    return this.sanitizeUser(user);
  }

  async deactivateAccount(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'DEACTIVATED' },
    });

    // Invalidate all sessions
    await this.prisma.session.updateMany({
      where: { userId },
      data: { isActive: false },
    });

    return { success: true };
  }

  async getNotificationPreferences(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    return user?.preferences || {};
  }

  async updateNotificationPreferences(userId: string, preferences: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    const currentPrefs = (user?.preferences as any) || {};

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        preferences: {
          ...currentPrefs,
          notifications: preferences,
        },
      },
    });

    return { success: true };
  }

  // Push tokens
  async registerPushToken(userId: string, token: string, platform: 'WEB' | 'IOS' | 'ANDROID') {
    await this.prisma.pushToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform },
    });

    return { success: true };
  }

  async removePushToken(token: string) {
    await this.prisma.pushToken.deleteMany({
      where: { token },
    });

    return { success: true };
  }

  async getUserPushTokens(userId: string) {
    return this.prisma.pushToken.findMany({
      where: { userId },
    });
  }

  private sanitizeUser(user: any) {
    const { passwordHash, passwordResetToken, passwordResetExpiresAt, ...sanitized } = user;
    return sanitized;
  }
}


