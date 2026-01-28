import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

export interface DataExport {
  exportedAt: string;
  user: any;
  familyMemberships: any[];
  careRecipients: any[];
  medications: any[];
  medicationLogs: any[];
  appointments: any[];
  timelineEntries: any[];
  notifications: any[];
  sessions: any[];
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

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

  /**
   * Export all user data for GDPR compliance (Data Portability)
   * Returns a comprehensive export of all user-related data
   */
  async exportUserData(userId: string): Promise<DataExport> {
    this.logger.log(`Starting data export for user ${userId}`);

    // Get user profile
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        timezone: true,
        avatarUrl: true,
        status: true,
        emailVerified: true,
        phoneVerified: true,
        preferences: true,
        onboardingCompleted: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get family memberships with family details
    const familyMemberships = await this.prisma.familyMember.findMany({
      where: { userId },
      include: {
        family: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        },
      },
    });

    // Get care recipients for families the user belongs to
    const familyIds = familyMemberships.map(m => m.familyId);
    const careRecipients = await this.prisma.careRecipient.findMany({
      where: { familyId: { in: familyIds } },
      include: {
        doctors: true,
        emergencyContacts: true,
      },
    });

    // Get medications for those care recipients
    const careRecipientIds = careRecipients.map(cr => cr.id);
    const medications = await this.prisma.medication.findMany({
      where: { careRecipientId: { in: careRecipientIds } },
    });

    // Get medication logs by this user
    const medicationLogs = await this.prisma.medicationLog.findMany({
      where: { givenById: userId },
      include: {
        medication: {
          select: {
            name: true,
            dosage: true,
          },
        },
      },
    });

    // Get appointments for care recipients
    const appointments = await this.prisma.appointment.findMany({
      where: { careRecipientId: { in: careRecipientIds } },
      include: {
        doctor: {
          select: {
            name: true,
            specialty: true,
          },
        },
        transportAssignment: true,
      },
    });

    // Get timeline entries created by this user
    const timelineEntries = await this.prisma.timelineEntry.findMany({
      where: { createdById: userId },
    });

    // Get notifications for this user
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 500, // Limit to most recent 500
    });

    // Get session history (sanitized)
    const sessions = await this.prisma.session.findMany({
      where: { userId },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        deviceInfo: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    this.logger.log(`Data export completed for user ${userId}`);

    return {
      exportedAt: new Date().toISOString(),
      user,
      familyMemberships: familyMemberships.map(m => ({
        familyId: m.familyId,
        familyName: m.family.name,
        role: m.role,
        nickname: m.nickname,
        joinedAt: m.joinedAt,
        isActive: m.isActive,
      })),
      careRecipients: careRecipients.map(cr => ({
        ...cr,
        // Sanitize sensitive medical info for export
      })),
      medications,
      medicationLogs: medicationLogs.map(log => ({
        id: log.id,
        medicationName: log.medication?.name,
        dosage: log.medication?.dosage,
        scheduledTime: log.scheduledTime,
        givenTime: log.givenTime,
        status: log.status,
        notes: log.notes,
        createdAt: log.createdAt,
      })),
      appointments,
      timelineEntries,
      notifications: notifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        read: n.read,
        createdAt: n.createdAt,
      })),
      sessions,
    };
  }

  /**
   * Delete all user data for GDPR compliance (Right to Erasure)
   * This is a soft delete that anonymizes data
   */
  async deleteUserData(userId: string): Promise<{ success: boolean; deletedAt: string }> {
    this.logger.warn(`Starting data deletion for user ${userId}`);

    // Anonymize user data
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted_${userId}@deleted.local`,
        fullName: 'Deleted User',
        phone: null,
        avatarUrl: null,
        status: 'DELETED',
        preferences: null,
        passwordHash: 'DELETED',
        emailVerificationCode: null,
        passwordResetToken: null,
      },
    });

    // Deactivate all sessions
    await this.prisma.session.deleteMany({
      where: { userId },
    });

    // Remove push tokens
    await this.prisma.pushToken.deleteMany({
      where: { userId },
    });

    // Mark notifications as deleted
    await this.prisma.notification.deleteMany({
      where: { userId },
    });

    // Log the deletion in audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'USER_DATA_DELETED',
        resource: 'user',
        resourceId: userId,
        metadata: { reason: 'GDPR_RIGHT_TO_ERASURE', deletedAt: new Date().toISOString() },
      },
    });

    this.logger.warn(`Data deletion completed for user ${userId}`);

    return {
      success: true,
      deletedAt: new Date().toISOString(),
    };
  }
}




