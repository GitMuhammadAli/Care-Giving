import { Entity, Column, ManyToOne, JoinColumn, Unique, Index } from 'typeorm';
import { BaseEntity } from '../../system/entity/base.entity';
import { Family } from './family.entity';
import { User } from '../../user/entity/user.entity';

export enum FamilyRole {
  ADMIN = 'ADMIN',
  CAREGIVER = 'CAREGIVER',
  VIEWER = 'VIEWER',
}

@Entity('family_members')
@Unique(['familyId', 'userId'])
@Index(['userId'])
export class FamilyMember extends BaseEntity {
  @Column({ type: 'uuid' })
  familyId: string;

  @ManyToOne(() => Family, (family) => family.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'family_id' })
  family: Family;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: FamilyRole, default: FamilyRole.VIEWER })
  role: FamilyRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  nickname?: string;

  @Column({ nullable: true, type: 'timestamptz' })
  joinedAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  notifications?: {
    emergencies: boolean;
    medications: boolean;
    appointments: boolean;
    shifts: boolean;
  };

  isAdmin(): boolean {
    return this.role === FamilyRole.ADMIN;
  }

  canManageFamily(): boolean {
    return this.role === FamilyRole.ADMIN;
  }

  canEditCareData(): boolean {
    return this.role === FamilyRole.ADMIN || this.role === FamilyRole.CAREGIVER;
  }
}

