import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { EmergencyAlert, EmergencyStatus } from '../entity/emergency-alert.entity';

@Injectable()
export class EmergencyAlertRepository extends Repository<EmergencyAlert> {
  constructor(private dataSource: DataSource) {
    super(EmergencyAlert, dataSource.createEntityManager());
  }

  async findByFamily(familyId: string, limit = 20): Promise<EmergencyAlert[]> {
    return this.find({
      where: { familyId },
      relations: ['careRecipient', 'triggeredBy', 'resolvedBy'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findActive(familyId: string): Promise<EmergencyAlert[]> {
    return this.find({
      where: {
        familyId,
        status: EmergencyStatus.ACTIVE,
      },
      relations: ['careRecipient', 'triggeredBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByCareRecipient(careRecipientId: string, limit = 10): Promise<EmergencyAlert[]> {
    return this.find({
      where: { careRecipientId },
      relations: ['triggeredBy', 'resolvedBy'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}

