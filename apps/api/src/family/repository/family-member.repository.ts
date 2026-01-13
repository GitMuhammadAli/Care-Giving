import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { FamilyMember, FamilyRole } from '../entity/family-member.entity';
import { ContextHelper } from '../../system/helper/context.helper';

@Injectable()
export class FamilyMemberRepository extends Repository<FamilyMember> {
  constructor(private dataSource: DataSource) {
    super(FamilyMember, dataSource.createEntityManager());
  }

  private getManager() {
    return ContextHelper.getTrx() || this.manager;
  }

  async findByFamilyAndUser(familyId: string, userId: string): Promise<FamilyMember | null> {
    return this.getManager().findOne(FamilyMember, {
      where: { familyId, userId, isActive: true },
      relations: ['user', 'family'],
    });
  }

  async findByFamily(familyId: string): Promise<FamilyMember[]> {
    return this.getManager().find(FamilyMember, {
      where: { familyId, isActive: true },
      relations: ['user'],
      order: { role: 'ASC', createdAt: 'ASC' },
    });
  }

  async findAdminsByFamily(familyId: string): Promise<FamilyMember[]> {
    return this.getManager().find(FamilyMember, {
      where: { familyId, role: FamilyRole.ADMIN, isActive: true },
      relations: ['user'],
    });
  }

  async countAdminsByFamily(familyId: string): Promise<number> {
    return this.getManager().count(FamilyMember, {
      where: { familyId, role: FamilyRole.ADMIN, isActive: true },
    });
  }

  async createMember(data: Partial<FamilyMember>): Promise<FamilyMember> {
    const member = this.getManager().create(FamilyMember, {
      ...data,
      joinedAt: new Date(),
    });
    return this.getManager().save(FamilyMember, member);
  }

  async updateRole(id: string, role: FamilyRole): Promise<void> {
    await this.getManager().update(FamilyMember, id, { role });
  }

  async deactivateMember(id: string): Promise<void> {
    await this.getManager().update(FamilyMember, id, { isActive: false });
  }

  async getUserFamilyIds(userId: string): Promise<string[]> {
    const members = await this.getManager().find(FamilyMember, {
      where: { userId, isActive: true },
      select: ['familyId'],
    });
    return members.map((m) => m.familyId);
  }
}

