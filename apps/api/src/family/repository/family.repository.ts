import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Family } from '../entity/family.entity';
import { ContextHelper } from '../../system/helper/context.helper';

@Injectable()
export class FamilyRepository extends Repository<Family> {
  constructor(private dataSource: DataSource) {
    super(Family, dataSource.createEntityManager());
  }

  private getManager() {
    return ContextHelper.getTrx() || this.manager;
  }

  async findById(id: string): Promise<Family | null> {
    return this.getManager().findOne(Family, {
      where: { id },
      relations: ['members', 'members.user', 'careRecipients'],
    });
  }

  async findByIdWithMembers(id: string): Promise<Family | null> {
    return this.getManager().findOne(Family, {
      where: { id },
      relations: ['members', 'members.user'],
    });
  }

  async findUserFamilies(userId: string): Promise<Family[]> {
    return this.getManager()
      .createQueryBuilder(Family, 'family')
      .innerJoin('family.members', 'member')
      .where('member.userId = :userId', { userId })
      .andWhere('member.isActive = true')
      .leftJoinAndSelect('family.members', 'allMembers')
      .leftJoinAndSelect('allMembers.user', 'user')
      .leftJoinAndSelect('family.careRecipients', 'careRecipients')
      .getMany();
  }

  async createFamily(data: Partial<Family>): Promise<Family> {
    const family = this.getManager().create(Family, data);
    return this.getManager().save(Family, family);
  }

  async updateFamily(id: string, data: Partial<Family>): Promise<Family> {
    await this.getManager().update(Family, id, data);
    return this.findById(id) as Promise<Family>;
  }
}

