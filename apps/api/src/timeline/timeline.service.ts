import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimelineEntryDto } from './dto/create-timeline-entry.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { subDays } from 'date-fns';

@Injectable()
export class TimelineService {
  constructor(
    private prisma: PrismaService,
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

  async addEntry(careRecipientId: string, userId: string, dto: CreateTimelineEntryDto) {
    const { careRecipient, membership } = await this.verifyAccess(careRecipientId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot add timeline entries');
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
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true },
        },
      },
    });

    // If high severity incident, notify family
    if (dto.severity === 'HIGH' || dto.severity === 'CRITICAL') {
      await this.notifications.notifyHighSeverityEntry(
        careRecipient.familyId,
        careRecipient,
        entry,
      );
    }

    return entry;
  }

  async getTimeline(
    careRecipientId: string,
    userId: string,
    options: {
      type?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    } = {},
  ) {
    await this.verifyAccess(careRecipientId, userId);

    return this.prisma.timelineEntry.findMany({
      where: {
        careRecipientId,
        ...(options.type && { type: options.type as any }),
        ...(options.startDate && { occurredAt: { gte: new Date(options.startDate) } }),
        ...(options.endDate && { occurredAt: { lte: new Date(options.endDate) } }),
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { occurredAt: 'desc' },
      take: options.limit || 50,
    });
  }

  async getVitalsHistory(careRecipientId: string, userId: string, days: number = 30) {
    await this.verifyAccess(careRecipientId, userId);

    const startDate = subDays(new Date(), days);

    return this.prisma.timelineEntry.findMany({
      where: {
        careRecipientId,
        type: 'VITALS',
        occurredAt: { gte: startDate },
      },
      orderBy: { occurredAt: 'asc' },
    });
  }

  async getIncidents(careRecipientId: string, userId: string, limit: number = 20) {
    await this.verifyAccess(careRecipientId, userId);

    return this.prisma.timelineEntry.findMany({
      where: {
        careRecipientId,
        type: 'INCIDENT',
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { occurredAt: 'desc' },
      take: limit,
    });
  }

  async getRecentActivity(careRecipientId: string, userId: string, limit: number = 10) {
    await this.verifyAccess(careRecipientId, userId);

    return this.prisma.timelineEntry.findMany({
      where: { careRecipientId },
      include: {
        createdBy: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async updateEntry(entryId: string, userId: string, data: Partial<CreateTimelineEntryDto>) {
    const entry = await this.prisma.timelineEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      throw new NotFoundException('Timeline entry not found');
    }

    const { membership } = await this.verifyAccess(entry.careRecipientId, userId);

    // Only creator or admin can edit
    if (entry.createdById !== userId && membership.role !== 'ADMIN') {
      throw new ForbiddenException('You cannot edit this entry');
    }

    return this.prisma.timelineEntry.update({
      where: { id: entryId },
      data: {
        title: data.title,
        description: data.description,
        severity: data.severity,
        vitals: data.vitals,
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true },
        },
      },
    });
  }

  async deleteEntry(entryId: string, userId: string) {
    const entry = await this.prisma.timelineEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      throw new NotFoundException('Timeline entry not found');
    }

    const { membership } = await this.verifyAccess(entry.careRecipientId, userId);

    // Only creator or admin can delete
    if (entry.createdById !== userId && membership.role !== 'ADMIN') {
      throw new ForbiddenException('You cannot delete this entry');
    }

    await this.prisma.timelineEntry.delete({
      where: { id: entryId },
    });

    return { success: true };
  }
}

