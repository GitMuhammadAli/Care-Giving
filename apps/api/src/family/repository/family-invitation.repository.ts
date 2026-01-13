import { Injectable } from '@nestjs/common';
import { DataSource, Repository, MoreThan } from 'typeorm';
import { FamilyInvitation, InvitationStatus } from '../entity/family-invitation.entity';
import { ContextHelper } from '../../system/helper/context.helper';

@Injectable()
export class FamilyInvitationRepository extends Repository<FamilyInvitation> {
  constructor(private dataSource: DataSource) {
    super(FamilyInvitation, dataSource.createEntityManager());
  }

  private getManager() {
    return ContextHelper.getTrx() || this.manager;
  }

  async findByToken(token: string): Promise<FamilyInvitation | null> {
    return this.getManager().findOne(FamilyInvitation, {
      where: { token },
      relations: ['family', 'invitedBy'],
    });
  }

  async findPendingByEmail(email: string): Promise<FamilyInvitation[]> {
    return this.getManager().find(FamilyInvitation, {
      where: {
        email: email.toLowerCase(),
        status: InvitationStatus.PENDING,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['family', 'invitedBy'],
    });
  }

  async findPendingByFamily(familyId: string): Promise<FamilyInvitation[]> {
    return this.getManager().find(FamilyInvitation, {
      where: {
        familyId,
        status: InvitationStatus.PENDING,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['invitedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findExistingPending(familyId: string, email: string): Promise<FamilyInvitation | null> {
    return this.getManager().findOne(FamilyInvitation, {
      where: {
        familyId,
        email: email.toLowerCase(),
        status: InvitationStatus.PENDING,
        expiresAt: MoreThan(new Date()),
      },
    });
  }

  async createInvitation(data: Partial<FamilyInvitation>): Promise<FamilyInvitation> {
    const invitation = this.getManager().create(FamilyInvitation, {
      ...data,
      email: data.email?.toLowerCase(),
    });
    return this.getManager().save(FamilyInvitation, invitation);
  }

  async updateStatus(id: string, status: InvitationStatus): Promise<void> {
    await this.getManager().update(FamilyInvitation, id, { status });
  }

  async expireOldInvitations(): Promise<number> {
    const result = await this.getManager().update(
      FamilyInvitation,
      {
        status: InvitationStatus.PENDING,
        expiresAt: MoreThan(new Date()),
      },
      { status: InvitationStatus.EXPIRED },
    );
    return result.affected || 0;
  }
}

