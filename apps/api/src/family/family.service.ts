import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../system/module/mail/mail.service';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../system/module/cache';
import { EventPublisherService } from '../events/publishers/event-publisher.service';
import { ROUTING_KEYS } from '../events/events.constants';
import { CreateFamilyDto } from './dto/create-family.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class FamilyService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private cacheService: CacheService,
    private eventPublisher: EventPublisherService,
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

    // Create membership in transaction and mark onboarding as complete
    // (invited users don't need onboarding - they're joining an existing family)
    const [_, __, family] = await this.prisma.$transaction([
      this.prisma.familyInvitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { onboardingCompleted: true },
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

    // Invalidate ALL related caches to ensure fresh data
    console.log('AcceptInvitation - Invalidating caches for user:', userId, 'family:', invitation.familyId);
    await this.invalidateUserFamiliesCache(userId);
    await this.invalidateFamilyCache(invitation.familyId);
    // Also use pattern-based invalidation for thorough cleanup
    await this.cacheService.delPattern(`user:*${userId}*`);

    console.log('AcceptInvitation - Complete. Family joined:', invitation.family.name);

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
      include: { user: { select: { fullName: true } } },
    });

    if (!admin || admin.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can update member roles');
    }

    const member = await this.prisma.familyMember.findFirst({
      where: { id: memberId, familyId },
      include: { user: { select: { id: true, fullName: true } } },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const oldRole = member.role;

    // Prevent removing the last admin
    if (member.role === 'ADMIN' && role !== 'ADMIN') {
      const adminCount = await this.prisma.familyMember.count({
        where: { familyId, role: 'ADMIN' },
      });

      if (adminCount <= 1) {
        throw new ForbiddenException('Cannot remove the last admin');
      }
    }

    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      select: { name: true },
    });

    const result = await this.prisma.familyMember.update({
      where: { id: memberId },
      data: { role },
    });

    // Publish role updated event
    await this.eventPublisher.publish(
      ROUTING_KEYS.FAMILY_MEMBER_ROLE_UPDATED,
      {
        memberId,
        memberUserId: member.userId,
        memberName: member.user?.fullName || 'Unknown',
        familyId,
        familyName: family?.name || 'Unknown',
        oldRole,
        newRole: role,
        updatedById: adminId,
        updatedByName: admin.user?.fullName || 'Admin',
      },
      { aggregateType: 'FamilyMember', aggregateId: memberId },
      { familyId, causedBy: adminId },
    );

    // Invalidate family cache
    await this.invalidateFamilyCache(familyId);

    return result;
  }

  async removeMember(familyId: string, memberId: string, adminId: string) {
    const admin = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId: adminId } },
      include: { user: { select: { fullName: true } } },
    });

    if (!admin || admin.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can remove members');
    }

    const member = await this.prisma.familyMember.findFirst({
      where: { id: memberId, familyId },
      include: { user: { select: { id: true, fullName: true, email: true } } },
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

    // Get family info and remaining members for notifications
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      select: { name: true },
    });

    const remainingMembers = await this.prisma.familyMember.findMany({
      where: { familyId, id: { not: memberId } },
      select: { userId: true },
    });

    await this.prisma.familyMember.delete({
      where: { id: memberId },
    });

    // Publish member removed event
    await this.eventPublisher.publish(
      ROUTING_KEYS.FAMILY_MEMBER_REMOVED,
      {
        memberId,
        memberName: member.user?.fullName || 'Unknown',
        memberEmail: member.user?.email || '',
        removedUserId: member.userId,
        familyId,
        familyName: family?.name || 'Unknown',
        removedById: adminId,
        removedByName: admin.user?.fullName || 'Admin',
        remainingMemberIds: remainingMembers.map((m) => m.userId),
      },
      { aggregateType: 'FamilyMember', aggregateId: memberId },
      { familyId, causedBy: adminId },
    );

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
      include: { family: { select: { name: true } } },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    const admin = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId: invitation.familyId, userId: adminId } },
      include: { user: { select: { fullName: true } } },
    });

    if (!admin || admin.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can cancel invitations');
    }

    await this.prisma.familyInvitation.update({
      where: { id: invitationId },
      data: { status: 'CANCELLED' },
    });

    // Publish invitation cancelled event (for audit purposes)
    await this.eventPublisher.publish(
      ROUTING_KEYS.FAMILY_INVITATION_CANCELLED,
      {
        invitationId,
        email: invitation.email,
        familyId: invitation.familyId,
        familyName: invitation.family?.name || 'Unknown',
        cancelledById: adminId,
        cancelledByName: admin.user?.fullName || 'Admin',
      },
      { aggregateType: 'FamilyInvitation', aggregateId: invitationId },
      { familyId: invitation.familyId, causedBy: adminId },
    );

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

  async deleteFamily(familyId: string, adminId: string) {
    // Verify user is admin of this family
    const admin = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId: adminId } },
      include: { user: { select: { fullName: true } } },
    });

    if (!admin || admin.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can delete the family');
    }

    // Get family info
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      select: { name: true },
    });

    // Get all member IDs for cache invalidation and notifications
    const members = await this.prisma.familyMember.findMany({
      where: { familyId },
      select: { userId: true },
    });

    // Publish family deleted event BEFORE deletion (so we have the data)
    await this.eventPublisher.publish(
      ROUTING_KEYS.FAMILY_DELETED,
      {
        familyId,
        familyName: family?.name || 'Unknown',
        deletedById: adminId,
        deletedByName: admin.user?.fullName || 'Admin',
        affectedUserIds: members.map((m) => m.userId),
      },
      { aggregateType: 'Family', aggregateId: familyId },
      { familyId, causedBy: adminId },
    );

    // Delete family and all related data (cascade should handle it)
    await this.prisma.family.delete({
      where: { id: familyId },
    });

    // Invalidate caches for all members
    await this.invalidateFamilyCache(familyId);
    for (const member of members) {
      await this.invalidateUserFamiliesCache(member.userId);
    }

    return { success: true, message: 'Family deleted successfully' };
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
