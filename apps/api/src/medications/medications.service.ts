import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { LogMedicationDto } from './dto/log-medication.dto';
import { startOfDay, endOfDay, format, parse } from 'date-fns';

@Injectable()
export class MedicationsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
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

    return this.prisma.medication.create({
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
        timesPerDay: dto.timesPerDay || 1,
        scheduledTimes: dto.scheduledTimes || [],
        currentSupply: dto.currentSupply,
        refillAt: dto.refillAt,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        notes: dto.notes,
      },
    });
  }

  async findAll(careRecipientId: string, userId: string, activeOnly: boolean = true) {
    await this.verifyAccess(careRecipientId, userId);

    return this.prisma.medication.findMany({
      where: {
        careRecipientId,
        ...(activeOnly && { isActive: true }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, userId: string) {
    const medication = await this.prisma.medication.findUnique({
      where: { id },
      include: {
        logs: {
          take: 10,
          orderBy: { scheduledTime: 'desc' },
          include: {
            givenBy: {
              select: { id: true, fullName: true },
            },
          },
        },
      },
    });

    if (!medication) {
      throw new NotFoundException('Medication not found');
    }

    await this.verifyAccess(medication.careRecipientId, userId);

    return medication;
  }

  async update(id: string, userId: string, dto: UpdateMedicationDto) {
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

    return this.prisma.medication.update({
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
        isActive: dto.isActive,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        notes: dto.notes,
      },
    });
  }

  async getTodaysSchedule(careRecipientId: string, userId: string) {
    await this.verifyAccess(careRecipientId, userId);

    const today = new Date();

    const medications = await this.prisma.medication.findMany({
      where: {
        careRecipientId,
        isActive: true,
      },
    });

    // Get today's logs
    const logs = await this.prisma.medicationLog.findMany({
      where: {
        medication: { careRecipientId },
        scheduledTime: {
          gte: startOfDay(today),
          lte: endOfDay(today),
        },
      },
      include: {
        givenBy: {
          select: { id: true, fullName: true },
        },
      },
    });

    // Build schedule
    const schedule = [];

    for (const med of medications) {
      for (const time of med.scheduledTimes) {
        const scheduledTime = parse(time, 'HH:mm', today);
        const log = logs.find(
          (l) =>
            l.medicationId === med.id &&
            format(l.scheduledTime, 'HH:mm') === time,
        );

        schedule.push({
          medication: med,
          scheduledTime: scheduledTime.toISOString(),
          time,
          status: log?.status || 'PENDING',
          logId: log?.id,
          givenTime: log?.givenTime,
          givenBy: log?.givenBy,
        });
      }
    }

    return schedule.sort(
      (a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime(),
    );
  }

  async logMedication(medicationId: string, userId: string, dto: LogMedicationDto) {
    const medication = await this.prisma.medication.findUnique({
      where: { id: medicationId },
    });

    if (!medication) {
      throw new NotFoundException('Medication not found');
    }

    const { membership, careRecipient } = await this.verifyAccess(
      medication.careRecipientId,
      userId,
    );

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot log medications');
    }

    // Create log
    const log = await this.prisma.medicationLog.create({
      data: {
        medicationId,
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

    // Update supply count if given
    if (dto.status === 'GIVEN' && medication.currentSupply !== null) {
      const newSupply = medication.currentSupply - 1;

      const updatedMedication = await this.prisma.medication.update({
        where: { id: medicationId },
        data: { currentSupply: newSupply },
        include: {
          careRecipient: {
            include: {
              family: true,
            },
          },
        },
      });

      // Check if refill needed
      if (newSupply <= (medication.refillAt || 5)) {
        // Trigger refill notification to all family members
        await this.notificationsService.notifyMedicationRefillNeeded(
          { ...updatedMedication, currentSupply: newSupply },
          updatedMedication.careRecipient,
          updatedMedication.careRecipient.familyId,
        );
      }
    }

    return log;
  }

  async getMedicationsNeedingRefill(careRecipientId: string, userId: string) {
    await this.verifyAccess(careRecipientId, userId);

    return this.prisma.medication.findMany({
      where: {
        careRecipientId,
        isActive: true,
        currentSupply: { not: null },
        refillAt: { not: null },
      },
    }).then(meds =>
      meds.filter(m => m.currentSupply !== null && m.refillAt !== null && m.currentSupply <= m.refillAt)
    );
  }

  async recordRefill(medicationId: string, userId: string, quantity: number) {
    const medication = await this.prisma.medication.findUnique({
      where: { id: medicationId },
    });

    if (!medication) {
      throw new NotFoundException('Medication not found');
    }

    const { membership } = await this.verifyAccess(medication.careRecipientId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot record refills');
    }

    return this.prisma.medication.update({
      where: { id: medicationId },
      data: {
        currentSupply: (medication.currentSupply || 0) + quantity,
        lastRefillDate: new Date(),
      },
    });
  }
}

