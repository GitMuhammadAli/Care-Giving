import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../system/module/mail/mail.service';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../system/module/cache';
import { CreateFamilyDto } from './dto/create-family.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class FamilyService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private cacheService: CacheService,
  ) {}

  async createFamily(userId: string, dto: CreateFamilyDto) {
    const family = await this.prisma.family.create({
      data: {
        name: dto.name,
        members: {
          create: {
            userId,
            role: 'ADMIN',
            nickname: dto.nickname,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
      },
    });

    // Invalidate user's families cache
    await this.invalidateUserFamiliesCache(userId);

    return family;
  }

  async inviteMember(familyId: string, invitedById: string, dto: InviteMemberDto) {
    // Verify inviter is ADMIN
    const inviter = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId: invitedById } },
    });

    if (!inviter || inviter.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can invite members');
    }

    // Check if already a member
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      const existingMember = await this.prisma.familyMember.findUnique({
        where: { familyId_userId: { familyId, userId: existingUser.id } },
      });

      if (existingMember) {
        throw new ForbiddenException('User is already a member of this family');
      }
    }

    // Check for pending invitation
    const pendingInvite = await this.prisma.familyInvitation.findFirst({
      where: {
        familyId,
        email: dto.email.toLowerCase(),
        status: 'PENDING',
      },
    });

    if (pendingInvite) {
      throw new ForbiddenException('An invitation is already pending for this email');
    }

    const token = randomBytes(32).toString('hex');

    const invitation = await this.prisma.familyInvitation.create({
      data: {
        familyId,
        email: dto.email.toLowerCase(),
        role: dto.role,
        token,
        invitedById,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
      include: {
        family: true,
      },
    });

    // Send invitation email
    const inviterUser = await this.prisma.user.findUnique({
      where: { id: invitedById },
      select: { fullName: true },
    });

    await this.mailService.sendFamilyInvitation(
      dto.email,
      inviterUser?.fullName || 'A family member',
      invitation.family.name,
      token,
    );

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    };
  }

  // Public method - get invitation details without auth
  async getInvitationDetails(token: string) {
    const invitation = await this.prisma.familyInvitation.findUnique({
      where: { token },
      include: {
        family: { select: { name: true } },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'PENDING') {
      throw new ForbiddenException('This invitation is no longer valid');
    }

    if (invitation.expiresAt < new Date()) {
      throw new ForbiddenException('This invitation has expired');
    }

    // Get inviter name separately since there's no relation
    const inviter = await this.prisma.user.findUnique({
      where: { id: invitation.invitedById },
      select: { fullName: true },
    });

    return {
      id: invitation.id,
      familyName: invitation.family.name,
      inviterName: inviter?.fullName || 'A family member',
      role: invitation.role,
      email: invitation.email,
      expiresAt: invitation.expiresAt,
    };
  }

  // Public method - decline invitation without auth
  async declineInvitation(token: string) {
    const invitation = await this.prisma.familyInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'PENDING') {
      throw new ForbiddenException('This invitation has already been processed');
    }

    await this.prisma.familyInvitation.update({
      where: { id: invitation.id },
      data: { status: 'CANCELLED' },
    });

    return { success: true, message: 'Invitation declined' };
  }

  async acceptInvitation(token: string, userId: string) {
    const invitation = await this.prisma.familyInvitation.findUnique({
      where: { token },
      include: { family: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'PENDING') {
      throw new ForbiddenException('Invitation has already been used');
    }

    if (invitation.expiresAt < new Date()) {
      await this.prisma.familyInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new ForbiddenException('Invitation has expired');
    }

    // Verify email matches
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.email !== invitation.email) {
      throw new ForbiddenException('This invitation is for a different email address');
    }

    // Create membership in transaction
    const [_, family] = await this.prisma.$transaction([
      this.prisma.familyInvitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      }),
      this.prisma.familyMember.create({
        data: {
          familyId: invitation.familyId,
          userId,
          role: invitation.role,
        },
        include: {
          family: {
            include: {
              members: {
                include: {
                  user: { select: { id: true, fullName: true, email: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    // Invalidate caches
    await this.invalidateUserFamiliesCache(userId);
    await this.invalidateFamilyCache(invitation.familyId);

    return family.family;
  }

  async getMyFamilies(userId: string) {
    const cacheKey = CACHE_KEYS.USER_FAMILIES(userId);

    return this.cacheService.getOrSet(
      cacheKey,
      () =>
        this.prisma.family.findMany({
          where: {
            members: { some: { userId } },
          },
          include: {
            members: {
              include: {
                user: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
              },
            },
            careRecipients: {
              select: {
                id: true,
                fullName: true,
                preferredName: true,
                photoUrl: true,
              },
            },
            _count: {
              select: { documents: true },
            },
          },
        }),
      CACHE_TTL.FAMILY,
    );
  }

  async getFamily(familyId: string, userId: string) {
    const membership = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this family');
    }

    const cacheKey = CACHE_KEYS.FAMILY(familyId);

    return this.cacheService.getOrSet(
      cacheKey,
      () =>
        this.prisma.family.findUnique({
          where: { id: familyId },
          include: {
            members: {
              include: {
                user: { select: { id: true, fullName: true, email: true, avatarUrl: true, phone: true } },
              },
            },
            careRecipients: true,
            invitations: {
              where: { status: 'PENDING' },
            },
          },
        }),
      CACHE_TTL.FAMILY,
    );
  }

  async updateMemberRole(familyId: string, memberId: string, adminId: string, role: 'ADMIN' | 'CAREGIVER' | 'VIEWER') {
    const admin = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId: adminId } },
    });

    if (!admin || admin.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can update member roles');
    }

    const member = await this.prisma.familyMember.findFirst({
      where: { id: memberId, familyId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Prevent removing the last admin
    if (member.role === 'ADMIN' && role !== 'ADMIN') {
      const adminCount = await this.prisma.familyMember.count({
        where: { familyId, role: 'ADMIN' },
      });

      if (adminCount <= 1) {
        throw new ForbiddenException('Cannot remove the last admin');
      }
    }

    const result = await this.prisma.familyMember.update({
      where: { id: memberId },
      data: { role },
    });

    // Invalidate family cache
    await this.invalidateFamilyCache(familyId);

    return result;
  }

  async removeMember(familyId: string, memberId: string, adminId: string) {
    const admin = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId: adminId } },
    });

    if (!admin || admin.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can remove members');
    }

    const member = await this.prisma.familyMember.findFirst({
      where: { id: memberId, familyId },
      include: { user: { select: { id: true } } },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === 'ADMIN') {
      const adminCount = await this.prisma.familyMember.count({
        where: { familyId, role: 'ADMIN' },
      });

      if (adminCount <= 1) {
        throw new ForbiddenException('Cannot remove the last admin');
      }
    }

    await this.prisma.familyMember.delete({
      where: { id: memberId },
    });

    // Invalidate caches
    await this.invalidateFamilyCache(familyId);
    if (member.user?.id) {
      await this.invalidateUserFamiliesCache(member.user.id);
    }

    return { success: true };
  }

  async cancelInvitation(invitationId: string, adminId: string) {
    const invitation = await this.prisma.familyInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    const admin = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId: invitation.familyId, userId: adminId } },
    });

    if (!admin || admin.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can cancel invitations');
    }

    await this.prisma.familyInvitation.update({
      where: { id: invitationId },
      data: { status: 'CANCELLED' },
    });

    return { success: true };
  }

  async resendInvitation(invitationId: string, adminId: string) {
    const invitation = await this.prisma.familyInvitation.findUnique({
      where: { id: invitationId },
      include: { family: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    const admin = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId: invitation.familyId, userId: adminId } },
    });

    if (!admin || admin.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can resend invitations');
    }

    if (invitation.status !== 'PENDING') {
      throw new ForbiddenException('Can only resend pending invitations');
    }

    if (invitation.expiresAt < new Date()) {
      throw new ForbiddenException('Invitation has expired. Please create a new one.');
    }

    // Get inviter name
    const inviterUser = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { fullName: true },
    });

    // Resend the email
    await this.mailService.sendFamilyInvitation(
      invitation.email,
      inviterUser?.fullName || 'A family member',
      invitation.family.name,
      invitation.token,
    );

    return { success: true };
  }

  // Cache invalidation helpers
  private async invalidateUserFamiliesCache(userId: string): Promise<void> {
    await this.cacheService.del([
      CACHE_KEYS.USER_FAMILIES(userId),
      CACHE_KEYS.USER_PROFILE(userId),
    ]);
  }

  private async invalidateFamilyCache(familyId: string): Promise<void> {
    await this.cacheService.del(CACHE_KEYS.FAMILY(familyId));
  }
}
