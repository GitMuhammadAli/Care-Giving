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

  async getEmergencyInfo(careRecipientId: string): Promise<any> {
    // This returns all critical info for emergency situations
    // Would be cached in frontend for offline access
    return {
      // Would fetch from care recipient service
      careRecipientId,
    };
  }
}

