import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../system/module/cache';
import { CreateEmergencyAlertDto } from './dto/create-emergency-alert.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EmergencyService {
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

  async getEmergencyInfo(careRecipientId: string, userId: string) {
    await this.verifyAccess(careRecipientId, userId);

    const cacheKey = CACHE_KEYS.EMERGENCY_INFO(careRecipientId);

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.fetchEmergencyInfo(careRecipientId),
      CACHE_TTL.EMERGENCY_INFO,
    );
  }

  private async fetchEmergencyInfo(careRecipientId: string) {
    const fullInfo = await this.prisma.careRecipient.findUnique({
      where: { id: careRecipientId },
      include: {
        doctors: true,
        medications: { where: { isActive: true } },
        emergencyContacts: { orderBy: { isPrimary: 'desc' } },
        family: {
          include: {
            documents: {
              where: {
                type: { in: ['INSURANCE_CARD', 'PHOTO_ID', 'POWER_OF_ATTORNEY', 'DNR'] },
              },
            },
            members: {
              include: {
                user: {
                  select: { id: true, fullName: true, phone: true },
                },
              },
            },
          },
        },
      },
    });

    if (!fullInfo) {
      throw new NotFoundException('Care recipient not found');
    }

    return {
      // Basic Info
      name: fullInfo.fullName,
      preferredName: fullInfo.preferredName,
      dateOfBirth: fullInfo.dateOfBirth,
      bloodType: fullInfo.bloodType,

      // Critical Medical
      allergies: fullInfo.allergies,
      conditions: fullInfo.conditions,

      // Current Medications (formatted for ER)
      medications: fullInfo.medications.map((m) => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        instructions: m.instructions,
      })),

      // Contacts
      emergencyContacts: fullInfo.emergencyContacts,
      familyMembers: fullInfo.family.members.map((m) => ({
        name: m.user.fullName,
        phone: m.user.phone,
        role: m.role,
        nickname: m.nickname,
      })),

      primaryDoctor: fullInfo.doctors.find((d) => d.specialty === 'Primary Care'),
      allDoctors: fullInfo.doctors,

      // Hospital & Insurance
      primaryHospital: fullInfo.primaryHospital,
      hospitalAddress: fullInfo.hospitalAddress,
      insurance: {
        provider: fullInfo.insuranceProvider,
        policyNumber: fullInfo.insurancePolicyNo,
      },

      // Critical Documents
      documents: fullInfo.family.documents,

      // Last updated
      updatedAt: fullInfo.updatedAt,
    };
  }

  async createEmergencyAlert(
    careRecipientId: string,
    userId: string,
    dto: CreateEmergencyAlertDto,
  ) {
    const { careRecipient, membership } = await this.verifyAccess(careRecipientId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot create emergency alerts');
    }

    const alert = await this.prisma.emergencyAlert.create({
      data: {
        careRecipientId,
        createdById: userId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        location: dto.location,
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true },
        },
      },
    });

    // Notify ALL family members immediately
    await this.notifications.notifyEmergency(
      careRecipient.familyId,
      careRecipientId,
      alert,
    );

    return alert;
  }

  async getActiveAlerts(careRecipientId: string, userId: string) {
    await this.verifyAccess(careRecipientId, userId);

    return this.prisma.emergencyAlert.findMany({
      where: {
        careRecipientId,
        status: { in: ['ACTIVE', 'ACKNOWLEDGED'] },
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acknowledgeAlert(alertId: string, userId: string) {
    const alert = await this.prisma.emergencyAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    await this.verifyAccess(alert.careRecipientId, userId);

    return this.prisma.emergencyAlert.update({
      where: { id: alertId },
      data: { status: 'ACKNOWLEDGED' },
    });
  }

  async resolveAlert(alertId: string, userId: string, resolutionNotes?: string) {
    const alert = await this.prisma.emergencyAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    const { membership } = await this.verifyAccess(alert.careRecipientId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot resolve alerts');
    }

    return this.prisma.emergencyAlert.update({
      where: { id: alertId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedById: userId,
        resolutionNotes,
      },
    });
  }

  async getAlertHistory(careRecipientId: string, userId: string, limit: number = 20) {
    await this.verifyAccess(careRecipientId, userId);

    return this.prisma.emergencyAlert.findMany({
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
}


