import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../system/module/cache';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { LogMedicationDto } from './dto/log-medication.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MedicationsService {
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

  async create(careRecipientId: string, userId: string, dto: CreateMedicationDto) {
    const { membership } = await this.verifyAccess(careRecipientId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot add medications');
    }

    const medication = await this.prisma.medication.create({
      data: {
        careRecipientId,
        name: dto.name,
        genericName: dto.genericName,
        dosage: dto.dosage,
        form: dto.form,
        instructions: dto.instructions,
        prescribedBy: dto.prescribedBy,
        pharmacy: dto.pharmacy,
        pharmacyPhone: dto.pharmacyPhone,
        frequency: dto.frequency,
        timesPerDay: dto.timesPerDay,
        scheduledTimes: dto.scheduledTimes || [],
        currentSupply: dto.currentSupply,
        refillAt: dto.refillAt,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        notes: dto.notes,
      },
    });

    // Invalidate cache
    await this.invalidateMedicationCache(careRecipientId);

    return medication;
  }

  async findAll(careRecipientId: string, userId: string, activeOnly: boolean = true) {
    await this.verifyAccess(careRecipientId, userId);

    const cacheKey = CACHE_KEYS.MEDICATIONS(careRecipientId);

    return this.cacheService.getOrSet(
      cacheKey,
      () =>
        this.prisma.medication.findMany({
          where: {
            careRecipientId,
            ...(activeOnly && { isActive: true }),
          },
          orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        }),
      CACHE_TTL.MEDICATIONS,
    );
  }

  async findOne(id: string, userId: string) {
    const cacheKey = CACHE_KEYS.MEDICATION(id);

    const medication = await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const med = await this.prisma.medication.findUnique({
          where: { id },
          include: {
            careRecipient: true,
            logs: {
              orderBy: { scheduledTime: 'desc' },
              take: 10,
              include: {
                givenBy: {
                  select: { id: true, fullName: true },
                },
              },
            },
          },
        });
        return med;
      },
      CACHE_TTL.MEDICATION,
    );

    if (!medication) {
      throw new NotFoundException('Medication not found');
    }

    await this.verifyAccess(medication.careRecipientId, userId);

    return medication;
  }

  async update(id: string, userId: string, dto: Partial<CreateMedicationDto>) {
    const medication = await this.prisma.medication.findUnique({
      where: { id },
    });

    if (!medication) {
      throw new NotFoundException('Medication not found');
    }

    const { membership } = await this.verifyAccess(medication.careRecipientId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot update medications');
    }

    const updated = await this.prisma.medication.update({
      where: { id },
      data: {
        name: dto.name,
        genericName: dto.genericName,
        dosage: dto.dosage,
        form: dto.form,
        instructions: dto.instructions,
        prescribedBy: dto.prescribedBy,
        pharmacy: dto.pharmacy,
        pharmacyPhone: dto.pharmacyPhone,
        frequency: dto.frequency,
        timesPerDay: dto.timesPerDay,
        scheduledTimes: dto.scheduledTimes,
        currentSupply: dto.currentSupply,
        refillAt: dto.refillAt,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        notes: dto.notes,
      },
    });

    // Invalidate cache
    await this.invalidateMedicationCache(medication.careRecipientId, id);

    return updated;
  }

  async deactivate(id: string, userId: string) {
    const medication = await this.prisma.medication.findUnique({
      where: { id },
    });

    if (!medication) {
      throw new NotFoundException('Medication not found');
    }

    const { membership } = await this.verifyAccess(medication.careRecipientId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot deactivate medications');
    }

    const updated = await this.prisma.medication.update({
      where: { id },
      data: { isActive: false, endDate: new Date() },
    });

    // Invalidate cache
    await this.invalidateMedicationCache(medication.careRecipientId, id);

    return updated;
  }

  /**
   * Invalidate medication caches
   */
  private async invalidateMedicationCache(careRecipientId: string, medicationId?: string): Promise<void> {
    const keys = [CACHE_KEYS.MEDICATIONS(careRecipientId)];
    if (medicationId) {
      keys.push(CACHE_KEYS.MEDICATION(medicationId));
    }
    await this.cacheService.del(keys);
  }

  async logMedication(id: string, userId: string, dto: LogMedicationDto) {
    const medication = await this.prisma.medication.findUnique({
      where: { id },
      include: { careRecipient: true },
    });

    if (!medication) {
      throw new NotFoundException('Medication not found');
    }

    const { membership } = await this.verifyAccess(medication.careRecipientId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot log medications');
    }

    const log = await this.prisma.medicationLog.create({
      data: {
        medicationId: id,
        givenById: userId,
        scheduledTime: new Date(dto.scheduledTime),
        givenTime: dto.status === 'GIVEN' ? new Date() : null,
        status: dto.status,
        skipReason: dto.skipReason,
        notes: dto.notes,
      },
      include: {
        givenBy: {
          select: { id: true, fullName: true },
        },
      },
    });

    // Update supply if given
    if (dto.status === 'GIVEN' && medication.currentSupply !== null) {
      const newSupply = medication.currentSupply - 1;

      await this.prisma.medication.update({
        where: { id },
        data: { currentSupply: newSupply },
      });

      // Check if refill needed
      if (medication.refillAt && newSupply <= medication.refillAt) {
        await this.notifications.notifyMedicationRefillNeeded(
          medication,
          medication.careRecipient,
          medication.careRecipient.familyId,
        );
      }
    }

    return log;
  }

  async getMedicationLogs(id: string, userId: string, options?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    const medication = await this.prisma.medication.findUnique({
      where: { id },
    });

    if (!medication) {
      throw new NotFoundException('Medication not found');
    }

    await this.verifyAccess(medication.careRecipientId, userId);

    const where: any = { medicationId: id };

    if (options?.startDate || options?.endDate) {
      where.scheduledTime = {};
      if (options?.startDate) {
        where.scheduledTime.gte = options.startDate;
      }
      if (options?.endDate) {
        where.scheduledTime.lte = options.endDate;
      }
    }

    return this.prisma.medicationLog.findMany({
      where,
      include: {
        givenBy: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { scheduledTime: 'desc' },
      take: options?.limit || 100,
    });
  }

  async getScheduleForDay(careRecipientId: string, userId: string, date: Date) {
    await this.verifyAccess(careRecipientId, userId);

    const medications = await this.prisma.medication.findMany({
      where: {
        careRecipientId,
        isActive: true,
      },
    });

    // Get logs for the day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const logs = await this.prisma.medicationLog.findMany({
      where: {
        medication: { careRecipientId },
        scheduledTime: { gte: startOfDay, lte: endOfDay },
      },
    });

    // Build schedule with status
    return medications.map((med) => ({
      medication: med,
      scheduledTimes: med.scheduledTimes,
      logs: logs.filter((l) => l.medicationId === med.id),
    }));
  }
}

