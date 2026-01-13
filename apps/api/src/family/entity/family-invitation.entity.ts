import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../system/entity/base.entity';
import { Family } from './family.entity';
import { User } from '../../user/entity/user.entity';
import { FamilyRole } from './family-member.entity';

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

@Entity('family_invitations')
@Index(['email'])
@Index(['token'])
export class FamilyInvitation extends BaseEntity {
  @Column({ type: 'uuid' })
  familyId: string;

  @ManyToOne(() => Family, (family) => family.invitations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'family_id' })
  family: Family;

  @Column()
  email: string;

  @Column({ type: 'enum', enum: FamilyRole, default: FamilyRole.VIEWER })
  role: FamilyRole;

  @Column({ unique: true })
  token: string;

  @Column({ type: 'enum', enum: InvitationStatus, default: InvitationStatus.PENDING })
  status: InvitationStatus;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'uuid' })
  invitedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'invited_by_id' })
  invitedBy: User;

  @Column({ nullable: true })
  message?: string;

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isPending(): boolean {
    return this.status === InvitationStatus.PENDING && !this.isExpired();
  }
}

