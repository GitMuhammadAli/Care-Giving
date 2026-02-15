import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../system/module/cache';
import { CreateTimelineEntryDto } from './dto/create-timeline-entry.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { EmbeddingIndexerService } from '../ai/services/embedding-indexer.service';

@Injectable()
export class TimelineService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    @Inject(forwardRef(() => NotificationsService))
    private notifications: NotificationsService,
    @Optional() private embeddingIndexer?: EmbeddingIndexerService,
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

    // Index for AI search (non-blocking)
    this.embeddingIndexer?.indexTimelineEntry(entry).catch(() => {});

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

    const updated = await this.prisma.timelineEntry.update({
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

    // Re-index for AI search (non-blocking)
    this.embeddingIndexer?.indexTimelineEntry(updated).catch(() => {});

    return updated;
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

    // Remove AI embedding (non-blocking)
    this.embeddingIndexer?.removeEmbedding('timeline_entry', id).catch(() => {});

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

  async getIncidents(careRecipientId: string, userId: string) {
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
    });
  }

  /**
   * Invalidate timeline caches
   */
  private async invalidateTimelineCache(careRecipientId: string): Promise<void> {
    await this.cacheService.del(CACHE_KEYS.TIMELINE_RECENT(careRecipientId));
    // Also invalidate vitals cache patterns
    await this.cacheService.delPattern(`recipient:vitals:${careRecipientId}:*`);
  }

  /**
   * Get activity feed for a family - aggregates recent activities from multiple sources
   */
  async getActivityFeed(familyId: string, userId: string, limit: number = 20) {
    // Verify user belongs to the family
    const membership = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this family');
    }

    // Get care recipients in this family
    const careRecipients = await this.prisma.careRecipient.findMany({
      where: { familyId },
      select: { id: true, fullName: true, preferredName: true },
    });
    const careRecipientIds = careRecipients.map(cr => cr.id);
    const careRecipientMap = new Map(careRecipients.map(cr => [cr.id, cr]));

    // Fetch recent activities from different sources in parallel
    const [timelineEntries, medicationLogs, appointments, emergencyAlerts] = await Promise.all([
      // Timeline entries
      this.prisma.timelineEntry.findMany({
        where: { careRecipientId: { in: careRecipientIds } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          createdBy: { select: { id: true, fullName: true } },
        },
      }),

      // Medication logs
      this.prisma.medicationLog.findMany({
        where: {
          medication: { careRecipientId: { in: careRecipientIds } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          medication: { select: { id: true, name: true, dosage: true, careRecipientId: true } },
          givenBy: { select: { id: true, fullName: true } },
        },
      }),

      // Recent/upcoming appointments
      this.prisma.appointment.findMany({
        where: {
          careRecipientId: { in: careRecipientIds },
          startTime: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          doctor: { select: { name: true, specialty: true } },
        },
      }),

      // Emergency alerts
      this.prisma.emergencyAlert.findMany({
        where: { careRecipientId: { in: careRecipientIds } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          createdBy: { select: { id: true, fullName: true } },
        },
      }),
    ]);

    // Transform and combine into unified activity format
    const activities: Array<{
      id: string;
      type: string;
      category: 'timeline' | 'medication' | 'appointment' | 'emergency';
      title: string;
      description?: string;
      careRecipientId: string;
      careRecipientName: string;
      actorName?: string;
      severity?: string;
      status?: string;
      timestamp: Date;
      metadata?: any;
    }> = [];

    // Add timeline entries
    timelineEntries.forEach(entry => {
      const cr = careRecipientMap.get(entry.careRecipientId);
      activities.push({
        id: entry.id,
        type: entry.type,
        category: 'timeline',
        title: entry.title,
        description: entry.description || undefined,
        careRecipientId: entry.careRecipientId,
        careRecipientName: cr?.preferredName || cr?.fullName || 'Unknown',
        actorName: entry.createdBy.fullName,
        severity: entry.severity || undefined,
        timestamp: entry.createdAt,
      });
    });

    // Add medication logs
    medicationLogs.forEach(log => {
      const cr = careRecipientMap.get(log.medication.careRecipientId);
      activities.push({
        id: log.id,
        type: 'MEDICATION_LOG',
        category: 'medication',
        title: `${log.medication.name} - ${log.status}`,
        description: log.notes || `Dosage: ${log.medication.dosage}`,
        careRecipientId: log.medication.careRecipientId,
        careRecipientName: cr?.preferredName || cr?.fullName || 'Unknown',
        actorName: log.givenBy.fullName,
        status: log.status,
        timestamp: log.createdAt,
        metadata: {
          medicationId: log.medication.id,
          scheduledTime: log.scheduledTime,
          givenTime: log.givenTime,
        },
      });
    });

    // Add appointments
    appointments.forEach(apt => {
      const cr = careRecipientMap.get(apt.careRecipientId);
      activities.push({
        id: apt.id,
        type: apt.type,
        category: 'appointment',
        title: apt.title,
        description: apt.doctor ? `with Dr. ${apt.doctor.name} (${apt.doctor.specialty})` : apt.location || undefined,
        careRecipientId: apt.careRecipientId,
        careRecipientName: cr?.preferredName || cr?.fullName || 'Unknown',
        status: apt.status,
        timestamp: apt.createdAt,
        metadata: {
          startTime: apt.startTime,
          endTime: apt.endTime,
          location: apt.location,
        },
      });
    });

    // Add emergency alerts
    emergencyAlerts.forEach(alert => {
      const cr = careRecipientMap.get(alert.careRecipientId);
      activities.push({
        id: alert.id,
        type: alert.type,
        category: 'emergency',
        title: alert.title,
        description: alert.description,
        careRecipientId: alert.careRecipientId,
        careRecipientName: cr?.preferredName || cr?.fullName || 'Unknown',
        actorName: alert.createdBy.fullName,
        status: alert.status,
        severity: 'CRITICAL',
        timestamp: alert.createdAt,
      });
    });

    // Sort by timestamp descending and limit
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      activities: activities.slice(0, limit),
      total: activities.length,
      familyId,
    };
  }
}


