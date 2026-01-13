import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Medication } from '../entity/medication.entity';

@Injectable()
export class MedicationRepository extends Repository<Medication> {
  constructor(private dataSource: DataSource) {
    super(Medication, dataSource.createEntityManager());
  }

  async findByCareRecipient(careRecipientId: string, activeOnly = true): Promise<Medication[]> {
    const where: any = { careRecipientId };
    if (activeOnly) {
      where.isActive = true;
    }
    
    return this.find({
      where,
      relations: ['createdBy'],
      order: { name: 'ASC' },
    });
  }

  async findWithLogs(id: string): Promise<Medication | null> {
    return this.findOne({
      where: { id },
      relations: ['logs', 'logs.loggedBy', 'createdBy'],
    });
  }

  async findLowSupply(careRecipientId: string): Promise<Medication[]> {
    return this.createQueryBuilder('medication')
      .where('medication.careRecipientId = :careRecipientId', { careRecipientId })
      .andWhere('medication.isActive = true')
      .andWhere('medication.currentSupply IS NOT NULL')
      .andWhere('medication.refillAlertAt IS NOT NULL')
      .andWhere('medication.currentSupply <= medication.refillAlertAt')
      .getMany();
  }
}

