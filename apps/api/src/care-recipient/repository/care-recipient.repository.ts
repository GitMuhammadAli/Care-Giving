import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { CareRecipient } from '../entity/care-recipient.entity';
import { ContextHelper } from '../../system/helper/context.helper';

@Injectable()
export class CareRecipientRepository extends Repository<CareRecipient> {
  constructor(private dataSource: DataSource) {
    super(CareRecipient, dataSource.createEntityManager());
  }

  private getManager() {
    return ContextHelper.getTrx() || this.manager;
  }

  async findById(id: string): Promise<CareRecipient | null> {
    return this.getManager().findOne(CareRecipient, {
      where: { id },
      relations: ['doctors', 'emergencyContacts', 'family'],
    });
  }

  async findByFamily(familyId: string): Promise<CareRecipient[]> {
    return this.getManager().find(CareRecipient, {
      where: { familyId },
      relations: ['doctors', 'emergencyContacts'],
      order: { createdAt: 'ASC' },
    });
  }

  async findWithMedications(id: string): Promise<CareRecipient | null> {
    return this.getManager().findOne(CareRecipient, {
      where: { id },
      relations: ['medications', 'doctors', 'emergencyContacts'],
    });
  }

  async createRecipient(data: Partial<CareRecipient>): Promise<CareRecipient> {
    const recipient = this.getManager().create(CareRecipient, data);
    return this.getManager().save(CareRecipient, recipient);
  }

  async updateRecipient(id: string, data: Partial<CareRecipient>): Promise<CareRecipient> {
    await this.getManager().update(CareRecipient, id, data);
    return this.findById(id) as Promise<CareRecipient>;
  }
}

