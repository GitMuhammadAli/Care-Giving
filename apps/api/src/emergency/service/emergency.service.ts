// @ts-nocheck
// TypeORM-based service - kept for reference/migration
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EmergencyAlert, EmergencyStatus } from '../entity/emergency-alert.entity';
import { EmergencyAlertRepository } from '../repository/emergency-alert.repository';
import { CreateEmergencyAlertDto } from '../dto/create-emergency-alert.dto';
import { ResolveAlertDto } from '../dto/resolve-alert.dto';
import { ContextHelper } from '../../system/helper/context.helper';
import { FamilyMemberRepository } from '../../family/repository/family-member.repository';

@Injectable()
export class EmergencyService {
  constructor(
    @InjectRepository(EmergencyAlertRepository)
    private readonly alertRepository: EmergencyAlertRepository,
    @InjectRepository(FamilyMemberRepository)
    private readonly familyMemberRepository: FamilyMemberRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createAlert(
    careRecipientId: string,
    familyId: string,
    dto: CreateEmergencyAlertDto,
  ): Promise<EmergencyAlert> {
    const user = ContextHelper.getUser();

    // Get all family members to notify
    const members = await this.familyMemberRepository.findByFamily(familyId);
    const notifiedUserIds = members.map((m) => m.userId);

    const alert = this.alertRepository.create({
      ...dto,
      careRecipientId,
      familyId,
      triggeredById: user.id,
      notifiedUserIds,
      status: EmergencyStatus.ACTIVE,
    });

    const saved = await this.alertRepository.save(alert);

    // Emit event for notifications
    this.eventEmitter.emit('emergency.alert.created', {
      alert: saved,
      familyId,
      notifiedUserIds,
    });

    return saved;
  }

  async findByFamily(familyId: string, limit = 20): Promise<EmergencyAlert[]> {
    return this.alertRepository.findByFamily(familyId, limit);
  }

  async findActive(familyId: string): Promise<EmergencyAlert[]> {
    return this.alertRepository.findActive(familyId);
  }

  async findOne(id: string): Promise<EmergencyAlert> {
    const alert = await this.alertRepository.findOne({
      where: { id },
      relations: ['careRecipient', 'triggeredBy', 'resolvedBy'],
    });

    if (!alert) {
      throw new NotFoundException('Emergency alert not found');
    }

    return alert;
  }

  async acknowledge(id: string): Promise<EmergencyAlert> {
    const user = ContextHelper.getUser();
    const alert = await this.findOne(id);

    const acknowledgedByIds = alert.acknowledgedByIds || [];
    if (!acknowledgedByIds.includes(user.id)) {
      acknowledgedByIds.push(user.id);
    }

    alert.acknowledgedByIds = acknowledgedByIds;
    if (alert.status === EmergencyStatus.ACTIVE) {
      alert.status = EmergencyStatus.ACKNOWLEDGED;
    }

    const updated = await this.alertRepository.save(alert);

    this.eventEmitter.emit('emergency.alert.acknowledged', {
      alert: updated,
      acknowledgedBy: user,
    });

    return updated;
  }

  async resolve(id: string, dto: ResolveAlertDto): Promise<EmergencyAlert> {
    const user = ContextHelper.getUser();
    const alert = await this.findOne(id);

    alert.status = EmergencyStatus.RESOLVED;
    alert.resolvedAt = new Date();
    alert.resolvedById = user.id;
    alert.resolutionNotes = dto.resolutionNotes;

    const updated = await this.alertRepository.save(alert);

    this.eventEmitter.emit('emergency.alert.resolved', {
      alert: updated,
      resolvedBy: user,
    });

    return updated;
  }

  async cancel(id: string): Promise<EmergencyAlert> {
    const user = ContextHelper.getUser();
    const alert = await this.findOne(id);

    // Only the person who triggered can cancel
    if (alert.triggeredById !== user.id) {
      throw new NotFoundException('Only the person who triggered the alert can cancel it');
    }

    alert.status = EmergencyStatus.CANCELLED;
    alert.resolvedAt = new Date();
    alert.resolvedById = user.id;

    const updated = await this.alertRepository.save(alert);

    this.eventEmitter.emit('emergency.alert.cancelled', {
      alert: updated,
      cancelledBy: user,
    });

    return updated;
  }

  async getEmergencyInfo(careRecipientId: string, familyId: string): Promise<any> {
    // Verify user has access to this family
    const user = ContextHelper.getUser();
    const member = await this.familyMemberRepository.findByFamilyAndUser(familyId, user.id);
    if (!member) {
      throw new NotFoundException('Care recipient not found');
    }

    // Get care recipient with all critical emergency info
    const careRecipient = await this.alertRepository.manager.findOne('CareRecipient', {
      where: { id: careRecipientId, familyId },
      relations: ['doctors', 'emergencyContacts'],
    });

    if (!careRecipient) {
      throw new NotFoundException('Care recipient not found');
    }

    // Get active medications for allergy/drug interaction info
    const medications = await this.alertRepository.manager.find('Medication', {
      where: { careRecipientId, isActive: true },
      select: ['id', 'name', 'genericName', 'dosage', 'form', 'instructions'],
    });

    // Get active emergency alerts
    const activeAlerts = await this.findActive(familyId);

    return {
      careRecipient: {
        id: careRecipient.id,
        firstName: careRecipient.firstName,
        lastName: careRecipient.lastName,
        preferredName: careRecipient.preferredName,
        dateOfBirth: careRecipient.dateOfBirth,
        photoUrl: careRecipient.photoUrl,
        bloodType: careRecipient.bloodType,
        allergies: careRecipient.allergies,
        conditions: careRecipient.conditions,
        notes: careRecipient.notes,
        primaryHospital: careRecipient.primaryHospital,
        hospitalAddress: careRecipient.hospitalAddress,
        insuranceProvider: careRecipient.insuranceProvider,
        insurancePolicyNo: careRecipient.insurancePolicyNo,
      },
      doctors: careRecipient.doctors || [],
      emergencyContacts: careRecipient.emergencyContacts || [],
      medications,
      activeAlerts,
      generatedAt: new Date().toISOString(),
    };
  }
}

