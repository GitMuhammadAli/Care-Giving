import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../system/entity/base.entity';
import { CareRecipient } from '../../care-recipient/entity/care-recipient.entity';
import { User } from '../../user/entity/user.entity';
import { Family } from '../../family/entity/family.entity';

export enum EmergencyType {
  FALL = 'fall',
  MEDICAL = 'medical',
  HOSPITALIZATION = 'hospitalization',
  MISSING = 'missing',
  OTHER = 'other',
}

export enum EmergencyStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  CANCELLED = 'cancelled',
}

@Entity('emergency_alerts')
@Index(['familyId', 'status'])
@Index(['careRecipientId', 'createdAt'])
export class EmergencyAlert extends BaseEntity {
  @Column({
    type: 'enum',
    enum: EmergencyType,
  })
  type: EmergencyType;

  @Column({
    type: 'enum',
    enum: EmergencyStatus,
    default: EmergencyStatus.ACTIVE,
  })
  status: EmergencyStatus;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  location: string;

  @Column({ type: 'simple-array', nullable: true })
  notifiedUserIds: string[];

  @Column({ type: 'simple-array', nullable: true })
  acknowledgedByIds: string[];

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ type: 'text', nullable: true })
  resolutionNotes: string;

  @Column({ nullable: true })
  resolvedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'resolvedById' })
  resolvedBy: User;

  @Column()
  careRecipientId: string;

  @ManyToOne(() => CareRecipient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'careRecipientId' })
  careRecipient: CareRecipient;

  @Column()
  familyId: string;

  @ManyToOne(() => Family, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'familyId' })
  family: Family;

  @Column()
  triggeredById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'triggeredById' })
  triggeredBy: User;
}

