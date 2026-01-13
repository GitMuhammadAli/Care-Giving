import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../system/entity/base.entity';
import { Medication } from './medication.entity';
import { User } from '../../user/entity/user.entity';

export enum MedicationLogStatus {
  GIVEN = 'given',
  SKIPPED = 'skipped',
  MISSED = 'missed',
}

@Entity('medication_logs')
@Index(['medicationId', 'scheduledTime'])
@Index(['loggedById', 'createdAt'])
export class MedicationLog extends BaseEntity {
  @Column({
    type: 'enum',
    enum: MedicationLogStatus,
  })
  status: MedicationLogStatus;

  @Column({ type: 'timestamp' })
  scheduledTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  givenTime: Date;

  @Column({ nullable: true })
  skipReason: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column()
  medicationId: string;

  @ManyToOne(() => Medication, (med) => med.logs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'medicationId' })
  medication: Medication;

  @Column()
  loggedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'loggedById' })
  loggedBy: User;
}

