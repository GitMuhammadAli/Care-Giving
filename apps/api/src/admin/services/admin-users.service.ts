import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminUserFilterDto } from '../dto/admin-user-filter.dto';
import { AdminUpdateUserDto, AdminCreateUserDto } from '../dto/admin-update-user.dto';
import { BulkUserActionDto, BulkUserAction } from '../dto/bulk-action.dto';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { SystemRole, Prisma } from '@prisma/client';

@Injectable()
export class AdminUsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(filter: AdminUserFilterDto) {
    const {
      search,
      status,
      systemRole,
      emailVerified,
      createdAfter,
      createdBefore,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filter;

    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (systemRole) {
      where.systemRole = systemRole;
    }

    if (emailVerified !== undefined) {
      where.emailVerified = emailVerified;
    }

    if (createdAfter) {
      where.createdAt = { ...(where.createdAt as any), gte: new Date(createdAfter) };
    }

    if (createdBefore) {
      where.createdAt = { ...(where.createdAt as any), lte: new Date(createdBefore) };
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          status: true,
          systemRole: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          avatarUrl: true,
          _count: {
            select: {
              familyMemberships: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((user) => ({
        ...user,
        familyCount: user._count.familyMemberships,
        _count: undefined,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        timezone: true,
        avatarUrl: true,
        status: true,
        systemRole: true,
        emailVerified: true,
        emailVerifiedAt: true,
        phoneVerified: true,
        lastLoginAt: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        onboardingCompleted: true,
        onboardingCompletedAt: true,
        createdAt: true,
        updatedAt: true,
        familyMemberships: {
          select: {
            id: true,
            role: true,
            joinedAt: true,
            family: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            sessions: { where: { isActive: true } },
            notifications: { where: { read: false } },
            medicationLogs: true,
            timelineEntries: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async create(dto: AdminCreateUserDto, adminId: string) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Generate temp password if not provided
    const tempPassword = dto.tempPassword || this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        status: dto.skipEmailVerification ? 'ACTIVE' : 'PENDING',
        systemRole: dto.systemRole || 'USER',
        emailVerified: dto.skipEmailVerification || false,
        emailVerifiedAt: dto.skipEmailVerification ? new Date() : null,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
        systemRole: true,
        createdAt: true,
      },
    });

    // Log admin action
    await this.logAdminAction(adminId, 'CREATE_USER', 'user', user.id, {
      email: user.email,
      systemRole: user.systemRole,
    });

    return {
      user,
      tempPassword: dto.skipEmailVerification ? tempPassword : undefined,
      message: dto.skipEmailVerification
        ? 'User created successfully'
        : 'User created. They will need to verify their email.',
    };
  }

  async update(id: string, dto: AdminUpdateUserDto, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If changing email, check it doesn't conflict
    if (dto.email && dto.email.toLowerCase() !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase() },
      });
      if (existingUser) {
        throw new ConflictException('Email already in use');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        ...dto,
        email: dto.email?.toLowerCase(),
        emailVerifiedAt: dto.emailVerified ? new Date() : user.emailVerifiedAt,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        status: true,
        systemRole: true,
        emailVerified: true,
        updatedAt: true,
      },
    });

    // Log admin action
    await this.logAdminAction(adminId, 'UPDATE_USER', 'user', id, {
      changes: dto,
    });

    return updatedUser;
  }

  async suspend(id: string, adminId: string, reason?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === 'SUSPENDED') {
      throw new BadRequestException('User is already suspended');
    }

    // Prevent suspending super admins
    if (user.systemRole === 'SUPER_ADMIN') {
      throw new BadRequestException('Cannot suspend a super admin');
    }

    await this.prisma.user.update({
      where: { id },
      data: { status: 'SUSPENDED' },
    });

    // Invalidate all sessions
    await this.prisma.session.updateMany({
      where: { userId: id },
      data: { isActive: false },
    });

    // Log admin action
    await this.logAdminAction(adminId, 'SUSPEND_USER', 'user', id, { reason });

    return { message: 'User suspended successfully' };
  }

  async activate(id: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === 'ACTIVE') {
      throw new BadRequestException('User is already active');
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Log admin action
    await this.logAdminAction(adminId, 'ACTIVATE_USER', 'user', id);

    return { message: 'User activated successfully' };
  }

  async resetPassword(id: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate password reset token
    const resetToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.user.update({
      where: { id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiresAt: expiresAt,
      },
    });

    // Invalidate all sessions
    await this.prisma.session.updateMany({
      where: { userId: id },
      data: { isActive: false },
    });

    // Log admin action
    await this.logAdminAction(adminId, 'RESET_PASSWORD', 'user', id);

    // In production, send email with reset link
    // For now, return the token (in dev mode)
    return {
      message: 'Password reset initiated',
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
    };
  }

  async delete(id: string, adminId: string, reason?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent deleting super admins
    if (user.systemRole === 'SUPER_ADMIN') {
      throw new BadRequestException('Cannot delete a super admin');
    }

    // Soft delete - set status to DELETED
    await this.prisma.user.update({
      where: { id },
      data: { status: 'DELETED' },
    });

    // Invalidate all sessions
    await this.prisma.session.updateMany({
      where: { userId: id },
      data: { isActive: false },
    });

    // Log admin action
    await this.logAdminAction(adminId, 'DELETE_USER', 'user', id, { reason });

    return { message: 'User deleted successfully' };
  }

  async bulkAction(dto: BulkUserActionDto, adminId: string) {
    const { userIds, action, reason } = dto;

    // Filter out super admins from bulk actions
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, systemRole: true },
    });

    const eligibleIds = users
      .filter((u) => u.systemRole !== 'SUPER_ADMIN')
      .map((u) => u.id);

    if (eligibleIds.length === 0) {
      throw new BadRequestException('No eligible users for this action');
    }

    let result: { affected: number; message: string };

    switch (action) {
      case BulkUserAction.SUSPEND:
        await this.prisma.user.updateMany({
          where: { id: { in: eligibleIds } },
          data: { status: 'SUSPENDED' },
        });
        await this.prisma.session.updateMany({
          where: { userId: { in: eligibleIds } },
          data: { isActive: false },
        });
        result = { affected: eligibleIds.length, message: 'Users suspended' };
        break;

      case BulkUserAction.ACTIVATE:
        await this.prisma.user.updateMany({
          where: { id: { in: eligibleIds } },
          data: { status: 'ACTIVE', failedLoginAttempts: 0, lockedUntil: null },
        });
        result = { affected: eligibleIds.length, message: 'Users activated' };
        break;

      case BulkUserAction.DELETE:
        await this.prisma.user.updateMany({
          where: { id: { in: eligibleIds } },
          data: { status: 'DELETED' },
        });
        await this.prisma.session.updateMany({
          where: { userId: { in: eligibleIds } },
          data: { isActive: false },
        });
        result = { affected: eligibleIds.length, message: 'Users deleted' };
        break;

      default:
        throw new BadRequestException('Invalid action');
    }

    // Log admin action
    await this.logAdminAction(adminId, `BULK_${action}`, 'user', null, {
      userIds: eligibleIds,
      reason,
    });

    return result;
  }

  async getUserActivity(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [auditLogs, sessions, recentNotifications] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { userId: id },
        orderBy: { timestamp: 'desc' },
        take: 50,
      }),
      this.prisma.session.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          deviceInfo: true,
          ipAddress: true,
          isActive: true,
          createdAt: true,
          lastUsedAt: true,
        },
      }),
      this.prisma.notification.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          type: true,
          title: true,
          read: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      auditLogs,
      sessions,
      recentNotifications,
    };
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  private async logAdminAction(
    adminId: string,
    action: string,
    resource: string,
    resourceId: string | null,
    metadata?: Record<string, any>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action,
        resource,
        resourceId,
        metadata,
      },
    });
  }
}

