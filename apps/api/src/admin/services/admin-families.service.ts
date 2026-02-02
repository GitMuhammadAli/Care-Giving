import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminFamilyFilterDto } from '../dto/admin-family-filter.dto';
import { BulkFamilyActionDto, BulkFamilyAction } from '../dto/bulk-action.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminFamiliesService {
  constructor(private prisma: PrismaService) {}

  async findAll(filter: AdminFamilyFilterDto) {
    const {
      search,
      createdAfter,
      createdBefore,
      minMembers,
      maxMembers,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filter;

    const where: Prisma.FamilyWhereInput = {};

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    if (createdAfter) {
      where.createdAt = { ...(where.createdAt as any), gte: new Date(createdAfter) };
    }

    if (createdBefore) {
      where.createdAt = { ...(where.createdAt as any), lte: new Date(createdBefore) };
    }

    const skip = (page - 1) * limit;

    // Get families with member counts
    const families = await this.prisma.family.findMany({
      where,
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            members: true,
            careRecipients: true,
            documents: true,
          },
        },
        members: {
          where: { role: 'ADMIN' },
          take: 1,
          select: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    });

    // Filter by member count if specified
    let filteredFamilies = families;
    if (minMembers !== undefined || maxMembers !== undefined) {
      filteredFamilies = families.filter((f) => {
        const memberCount = f._count.members;
        if (minMembers !== undefined && memberCount < minMembers) return false;
        if (maxMembers !== undefined && memberCount > maxMembers) return false;
        return true;
      });
    }

    const total = await this.prisma.family.count({ where });

    return {
      data: filteredFamilies.map((family) => ({
        id: family.id,
        name: family.name,
        createdAt: family.createdAt,
        updatedAt: family.updatedAt,
        memberCount: family._count.members,
        careRecipientCount: family._count.careRecipients,
        documentCount: family._count.documents,
        admin: family.members[0]?.user || null,
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
    const family = await this.prisma.family.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        members: {
          select: {
            id: true,
            role: true,
            nickname: true,
            canEdit: true,
            isActive: true,
            joinedAt: true,
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
                avatarUrl: true,
                status: true,
              },
            },
          },
        },
        careRecipients: {
          select: {
            id: true,
            fullName: true,
            preferredName: true,
            dateOfBirth: true,
            photoUrl: true,
            createdAt: true,
            _count: {
              select: {
                medications: { where: { isActive: true } },
                appointments: true,
                emergencyAlerts: { where: { status: 'ACTIVE' } },
              },
            },
          },
        },
        documents: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        invitations: {
          where: { status: 'PENDING' },
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            expiresAt: true,
          },
        },
        _count: {
          select: {
            members: true,
            careRecipients: true,
            documents: true,
          },
        },
      },
    });

    if (!family) {
      throw new NotFoundException('Family not found');
    }

    return family;
  }

  async update(id: string, data: { name?: string }, adminId: string) {
    const family = await this.prisma.family.findUnique({ where: { id } });

    if (!family) {
      throw new NotFoundException('Family not found');
    }

    const updatedFamily = await this.prisma.family.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        updatedAt: true,
      },
    });

    // Log admin action
    await this.logAdminAction(adminId, 'UPDATE_FAMILY', 'family', id, {
      changes: data,
    });

    return updatedFamily;
  }

  async delete(id: string, adminId: string, reason?: string) {
    const family = await this.prisma.family.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            members: true,
            careRecipients: true,
          },
        },
      },
    });

    if (!family) {
      throw new NotFoundException('Family not found');
    }

    // Delete family (cascade will handle related records)
    await this.prisma.family.delete({ where: { id } });

    // Log admin action
    await this.logAdminAction(adminId, 'DELETE_FAMILY', 'family', id, {
      reason,
      familyName: family.name,
      memberCount: family._count.members,
      careRecipientCount: family._count.careRecipients,
    });

    return { message: 'Family deleted successfully' };
  }

  async getMembers(id: string) {
    const family = await this.prisma.family.findUnique({
      where: { id },
      select: {
        members: {
          select: {
            id: true,
            role: true,
            nickname: true,
            canEdit: true,
            isActive: true,
            joinedAt: true,
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
                phone: true,
                avatarUrl: true,
                status: true,
                systemRole: true,
                lastLoginAt: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!family) {
      throw new NotFoundException('Family not found');
    }

    return family.members;
  }

  async addMember(
    familyId: string,
    userId: string,
    role: 'ADMIN' | 'CAREGIVER' | 'VIEWER',
    adminId: string,
  ) {
    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (!family) {
      throw new NotFoundException('Family not found');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if already a member
    const existingMember = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });

    if (existingMember) {
      throw new BadRequestException('User is already a member of this family');
    }

    const member = await this.prisma.familyMember.create({
      data: {
        familyId,
        userId,
        role,
      },
      select: {
        id: true,
        role: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    // Log admin action
    await this.logAdminAction(adminId, 'ADD_FAMILY_MEMBER', 'family', familyId, {
      userId,
      role,
    });

    return member;
  }

  async removeMember(familyId: string, memberId: string, adminId: string) {
    const member = await this.prisma.familyMember.findFirst({
      where: { id: memberId, familyId },
      include: { user: { select: { email: true } } },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this family');
    }

    await this.prisma.familyMember.delete({ where: { id: memberId } });

    // Log admin action
    await this.logAdminAction(adminId, 'REMOVE_FAMILY_MEMBER', 'family', familyId, {
      memberId,
      userEmail: member.user.email,
    });

    return { message: 'Member removed from family' };
  }

  async transferOwnership(
    familyId: string,
    newOwnerId: string,
    adminId: string,
  ) {
    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (!family) {
      throw new NotFoundException('Family not found');
    }

    const newOwner = await this.prisma.familyMember.findFirst({
      where: { familyId, userId: newOwnerId },
    });

    if (!newOwner) {
      throw new BadRequestException('New owner must be an existing family member');
    }

    // Demote current admins to caregivers and promote new owner
    await this.prisma.$transaction([
      this.prisma.familyMember.updateMany({
        where: { familyId, role: 'ADMIN' },
        data: { role: 'CAREGIVER' },
      }),
      this.prisma.familyMember.update({
        where: { id: newOwner.id },
        data: { role: 'ADMIN' },
      }),
    ]);

    // Log admin action
    await this.logAdminAction(adminId, 'TRANSFER_OWNERSHIP', 'family', familyId, {
      newOwnerId,
    });

    return { message: 'Family ownership transferred successfully' };
  }

  async getActivity(familyId: string) {
    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (!family) {
      throw new NotFoundException('Family not found');
    }

    // Get recent activity across the family
    const [recentTimeline, recentAppointments, recentMedLogs] = await Promise.all([
      this.prisma.timelineEntry.findMany({
        where: {
          careRecipient: { familyId },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          type: true,
          title: true,
          createdAt: true,
          createdBy: {
            select: { fullName: true },
          },
          careRecipient: {
            select: { fullName: true },
          },
        },
      }),
      this.prisma.appointment.findMany({
        where: {
          careRecipient: { familyId },
        },
        orderBy: { startTime: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          type: true,
          startTime: true,
          status: true,
          careRecipient: {
            select: { fullName: true },
          },
        },
      }),
      this.prisma.medicationLog.findMany({
        where: {
          medication: {
            careRecipient: { familyId },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          status: true,
          scheduledTime: true,
          givenTime: true,
          medication: {
            select: {
              name: true,
              careRecipient: {
                select: { fullName: true },
              },
            },
          },
          givenBy: {
            select: { fullName: true },
          },
        },
      }),
    ]);

    return {
      timeline: recentTimeline,
      appointments: recentAppointments,
      medicationLogs: recentMedLogs,
    };
  }

  async bulkAction(dto: BulkFamilyActionDto, adminId: string) {
    const { familyIds, action, reason } = dto;

    switch (action) {
      case BulkFamilyAction.DELETE:
        // Get family details for audit log
        const families = await this.prisma.family.findMany({
          where: { id: { in: familyIds } },
          select: { id: true, name: true },
        });

        await this.prisma.family.deleteMany({
          where: { id: { in: familyIds } },
        });

        // Log admin action
        await this.logAdminAction(adminId, 'BULK_DELETE_FAMILIES', 'family', null, {
          familyIds,
          familyNames: families.map((f) => f.name),
          reason,
        });

        return { affected: familyIds.length, message: 'Families deleted' };

      default:
        throw new BadRequestException('Invalid action');
    }
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

