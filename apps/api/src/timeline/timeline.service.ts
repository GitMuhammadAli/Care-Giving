import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../system/module/cache';
import { CreateTimelineEntryDto } from './dto/create-timeline-entry.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TimelineService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    @Inject(forwardRef(() => NotificationsService))
    private notifications: NotificationsService,
  ) {}

  private async verifyAccess(careRecipientId: string, userId: string) {
    const careRecipient = await this.prisma.careRecipient.findUnique({
      where: { id: careRecipientId },
    });

    if (!careRecipient) {
      throw new NotFoundException('Care recipient not found');
    }

    const membership = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId: careRecipient.familyId, userId } },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this care recipient');
    }

    return { careRecipient, membership };
  }

  async create(careRecipientId: string, userId: string, dto: CreateTimelineEntryDto) {
    const { careRecipient, membership } = await this.verifyAccess(careRecipientId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot create timeline entries');
    }

    const entry = await this.prisma.timelineEntry.create({
      data: {
        careRecipientId,
        createdById: userId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        severity: dto.severity,
        vitals: dto.vitals,
        attachments: dto.attachments || [],
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true },
        },
      },
    });

    // Notify family for high severity entries
    if (dto.severity === 'HIGH' || dto.severity === 'CRITICAL') {
      await this.notifications.notifyHighSeverityEntry(
        careRecipient.familyId,
        careRecipient,
        entry,
      );
    }

    // Invalidate cache
    await this.invalidateTimelineCache(careRecipientId);

    return entry;
  }

  async findAll(careRecipientId: string, userId: string, options?: {
    type?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    await this.verifyAccess(careRecipientId, userId);

    const where: any = { careRecipientId };

    if (options?.type) {
      where.type = options.type;
    }

    if (options?.startDate || options?.endDate) {
      where.occurredAt = {};
      if (options?.startDate) {
        where.occurredAt.gte = options.startDate;
      }
      if (options?.endDate) {
        where.occurredAt.lte = options.endDate;
      }
    }

    return this.prisma.timelineEntry.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { occurredAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });
  }

  async findOne(id: string, userId: string) {
    const entry = await this.prisma.timelineEntry.findUnique({
      where: { id },
      include: {
        careRecipient: true,
        createdBy: {
          select: { id: true, fullName: true },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException('Timeline entry not found');
    }

    await this.verifyAccess(entry.careRecipientId, userId);

    return entry;
  }

  async update(id: string, userId: string, dto: Partial<CreateTimelineEntryDto>) {
    const entry = await this.prisma.timelineEntry.findUnique({
      where: { id },
      include: { careRecipient: true },
    });

    if (!entry) {
      throw new NotFoundException('Timeline entry not found');
    }

    const { membership } = await this.verifyAccess(entry.careRecipientId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot update timeline entries');
    }

    // Only creator or admin can update
    if (entry.createdById !== userId && membership.role !== 'ADMIN') {
      throw new ForbiddenException('You can only update your own entries');
    }

    return this.prisma.timelineEntry.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        severity: dto.severity,
        vitals: dto.vitals,
        attachments: dto.attachments,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true },
        },
      },
    });
  }

  async delete(id: string, userId: string) {
    const entry = await this.prisma.timelineEntry.findUnique({
      where: { id },
      include: { careRecipient: true },
    });

    if (!entry) {
      throw new NotFoundException('Timeline entry not found');
    }

    const { membership } = await this.verifyAccess(entry.careRecipientId, userId);

    // Only creator or admin can delete
    if (entry.createdById !== userId && membership.role !== 'ADMIN') {
      throw new ForbiddenException('You can only delete your own entries');
    }

    await this.prisma.timelineEntry.delete({
      where: { id },
    });

    return { success: true };
  }

  async getRecentVitals(careRecipientId: string, userId: string, days: number = 7) {
    await this.verifyAccess(careRecipientId, userId);

    const cacheKey = CACHE_KEYS.VITALS_RECENT(careRecipientId, days);

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        return this.prisma.timelineEntry.findMany({
          where: {
            careRecipientId,
            type: 'VITALS',
            occurredAt: { gte: startDate },
          },
          orderBy: { occurredAt: 'desc' },
        });
      },
      CACHE_TTL.VITALS,
    );
  }

  /**
   * Invalidate timeline caches
   */
  private async invalidateTimelineCache(careRecipientId: string): Promise<void> {
    await this.cacheService.del(CACHE_KEYS.TIMELINE_RECENT(careRecipientId));
    // Also invalidate vitals cache patterns
    await this.cacheService.delPattern(`recipient:vitals:${careRecipientId}:*`);
  }
}


