import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../system/module/cache';
import { CreateShiftDto } from './dto/create-shift.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { addDays, startOfDay, endOfDay, format } from 'date-fns';

@Injectable()
export class CaregiverShiftsService {
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

  async createShift(careRecipientId: string, userId: string, dto: CreateShiftDto) {
    const { membership } = await this.verifyAccess(careRecipientId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot create shifts');
    }

    // Check for conflicts
    const conflict = await this.prisma.caregiverShift.findFirst({
      where: {
        careRecipientId,
        caregiverId: dto.caregiverId,
        status: { not: 'CANCELLED' },
        OR: [
          {
            startTime: { lte: new Date(dto.startTime) },
            endTime: { gt: new Date(dto.startTime) },
          },
          {
            startTime: { lt: new Date(dto.endTime) },
            endTime: { gte: new Date(dto.endTime) },
          },
          {
            startTime: { gte: new Date(dto.startTime) },
            endTime: { lte: new Date(dto.endTime) },
          },
        ],
      },
    });

    if (conflict) {
      throw new ConflictException('Shift overlaps with an existing shift');
    }

    const shift = await this.prisma.caregiverShift.create({
      data: {
        careRecipientId,
        caregiverId: dto.caregiverId,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        notes: dto.notes,
      },
      include: {
        caregiver: {
          select: { id: true, fullName: true, phone: true },
        },
        careRecipient: {
          select: { fullName: true, preferredName: true },
        },
      },
    });

    // Notify assigned caregiver
    await this.notifications.notifyShiftAssigned(shift);

    // Invalidate cache
    await this.invalidateShiftCache(careRecipientId);

    return shift;
  }

  /**
   * Invalidate shift caches
   */
  private async invalidateShiftCache(careRecipientId: string, shiftId?: string): Promise<void> {
    const keys = [
      CACHE_KEYS.SHIFT_CURRENT(careRecipientId),
      CACHE_KEYS.SHIFTS_UPCOMING(careRecipientId),
    ];
    if (shiftId) {
      keys.push(CACHE_KEYS.SHIFT(shiftId));
    }
    await this.cacheService.del(keys);
    // Also invalidate day cache patterns
    await this.cacheService.delPattern(`recipient:shifts:${careRecipientId}:*`);
  }

  async getCurrentShift(careRecipientId: string) {
    const cacheKey = CACHE_KEYS.SHIFT_CURRENT(careRecipientId);

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const now = new Date();

        return this.prisma.caregiverShift.findFirst({
          where: {
            careRecipientId,
            startTime: { lte: now },
            endTime: { gte: now },
            status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
          },
          include: {
            caregiver: {
              select: { id: true, fullName: true, phone: true },
            },
          },
        });
      },
      CACHE_TTL.SHIFT_CURRENT,
    );
  }

  async getUpcoming(careRecipientId: string, userId: string, days: number = 7) {
    await this.verifyAccess(careRecipientId, userId);

    const cacheKey = CACHE_KEYS.SHIFTS_UPCOMING(careRecipientId);

    return this.cacheService.getOrSet(
      cacheKey,
      () =>
        this.prisma.caregiverShift.findMany({
          where: {
            careRecipientId,
            startTime: { gte: new Date(), lte: addDays(new Date(), days) },
            status: { not: 'CANCELLED' },
          },
          include: {
            caregiver: {
              select: { id: true, fullName: true, phone: true },
            },
          },
          orderBy: { startTime: 'asc' },
        }),
      CACHE_TTL.SHIFTS_UPCOMING,
    );
  }

  async getForDay(careRecipientId: string, userId: string, date: Date) {
    await this.verifyAccess(careRecipientId, userId);

    const dateStr = format(date, 'yyyy-MM-dd');
    const cacheKey = CACHE_KEYS.SHIFTS_DAY(careRecipientId, dateStr);

    return this.cacheService.getOrSet(
      cacheKey,
      () =>
        this.prisma.caregiverShift.findMany({
          where: {
            careRecipientId,
            startTime: { gte: startOfDay(date), lte: endOfDay(date) },
            status: { not: 'CANCELLED' },
          },
          include: {
            caregiver: {
              select: { id: true, fullName: true, phone: true },
            },
          },
          orderBy: { startTime: 'asc' },
        }),
      CACHE_TTL.SHIFTS_DAY,
    );
  }

  async getMyShifts(userId: string, upcoming: boolean = true) {
    return this.prisma.caregiverShift.findMany({
      where: {
        caregiverId: userId,
        ...(upcoming && { startTime: { gte: new Date() } }),
        status: { not: 'CANCELLED' },
      },
      include: {
        careRecipient: {
          select: { id: true, fullName: true, preferredName: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async checkIn(shiftId: string, userId: string) {
    const shift = await this.prisma.caregiverShift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.caregiverId !== userId) {
      throw new ForbiddenException('This is not your shift');
    }

    if (shift.status !== 'SCHEDULED' && shift.status !== 'CONFIRMED') {
      throw new ForbiddenException('Shift cannot be checked into');
    }

    const updated = await this.prisma.caregiverShift.update({
      where: { id: shiftId },
      data: {
        status: 'IN_PROGRESS',
        checkedInAt: new Date(),
      },
      include: {
        careRecipient: {
          select: { fullName: true, preferredName: true },
        },
      },
    });

    // Invalidate cache
    await this.invalidateShiftCache(shift.careRecipientId, shiftId);

    return updated;
  }

  async checkOut(shiftId: string, userId: string, handoffNotes?: string) {
    const shift = await this.prisma.caregiverShift.findUnique({
      where: { id: shiftId },
      include: {
        careRecipient: true,
      },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.caregiverId !== userId) {
      throw new ForbiddenException('This is not your shift');
    }

    if (shift.status !== 'IN_PROGRESS') {
      throw new ForbiddenException('Shift is not in progress');
    }

    const updated = await this.prisma.caregiverShift.update({
      where: { id: shiftId },
      data: {
        status: 'COMPLETED',
        checkedOutAt: new Date(),
        notes: handoffNotes || shift.notes,
      },
      include: {
        caregiver: {
          select: { id: true, fullName: true },
        },
        careRecipient: {
          select: { fullName: true, preferredName: true },
        },
      },
    });

    // Notify next caregiver if there is one
    const nextShift = await this.prisma.caregiverShift.findFirst({
      where: {
        careRecipientId: shift.careRecipientId,
        startTime: { gt: new Date() },
        status: { not: 'CANCELLED' },
      },
      include: {
        caregiver: true,
      },
      orderBy: { startTime: 'asc' },
    });

    if (nextShift) {
      await this.notifications.notifyShiftHandoff(
        updated.caregiver,
        nextShift.caregiver,
        updated.careRecipient,
        handoffNotes,
      );
    }

    // Invalidate cache
    await this.invalidateShiftCache(shift.careRecipientId, shiftId);

    return updated;
  }

  async confirmShift(shiftId: string, userId: string) {
    const shift = await this.prisma.caregiverShift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.caregiverId !== userId) {
      throw new ForbiddenException('This is not your shift');
    }

    const confirmed = await this.prisma.caregiverShift.update({
      where: { id: shiftId },
      data: { status: 'CONFIRMED' },
    });

    // Invalidate cache
    await this.invalidateShiftCache(shift.careRecipientId, shiftId);

    return confirmed;
  }

  async cancelShift(shiftId: string, userId: string) {
    const shift = await this.prisma.caregiverShift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    const { membership } = await this.verifyAccess(shift.careRecipientId, userId);

    // Only admins or the assigned caregiver can cancel
    if (membership.role !== 'ADMIN' && shift.caregiverId !== userId) {
      throw new ForbiddenException('You cannot cancel this shift');
    }

    const cancelled = await this.prisma.caregiverShift.update({
      where: { id: shiftId },
      data: { status: 'CANCELLED' },
    });

    // Invalidate cache
    await this.invalidateShiftCache(shift.careRecipientId, shiftId);

    return cancelled;
  }
}


