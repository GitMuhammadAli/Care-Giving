import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../system/entity/base.entity';
import { CareRecipient } from '../../care-recipient/entity/care-recipient.entity';
import { User } from '../../user/entity/user.entity';
import { MedicationLog } from './medication-log.entity';

export enum MedicationForm {
  TABLET = 'tablet',
  CAPSULE = 'capsule',
  LIQUID = 'liquid',
  INJECTION = 'injection',
  PATCH = 'patch',
  CREAM = 'cream',
  INHALER = 'inhaler',
  DROPS = 'drops',
  SUPPOSITORY = 'suppository',
  OTHER = 'other',
}

export enum MedicationFrequency {
  ONCE_DAILY = 'once_daily',
  TWICE_DAILY = 'twice_daily',
  THREE_TIMES_DAILY = 'three_times_daily',
  FOUR_TIMES_DAILY = 'four_times_daily',
  EVERY_OTHER_DAY = 'every_other_day',
  WEEKLY = 'weekly',
  AS_NEEDED = 'as_needed',
  CUSTOM = 'custom',
}

@Entity('medications')
@Index(['careRecipientId', 'isActive'])
export class Medication extends BaseEntity {
  @Column()
  name: string;

  @Column()
  dosage: string;

  @Column({
    type: 'enum',
    enum: MedicationForm,
    default: MedicationForm.TABLET,
  })
  form: MedicationForm;

  @Column({
    type: 'enum',
    enum: MedicationFrequency,
    default: MedicationFrequency.ONCE_DAILY,
  })
  frequency: MedicationFrequency;

  @Column({ type: 'simple-array' })
  scheduledTimes: string[]; // ['08:00', '14:00', '20:00']

  @Column({ type: 'text', nullable: true })
  instructions: string;

  @Column({ nullable: true })
  prescribedBy: string;

  @Column({ nullable: true })
  pharmacy: string;

  @Column({ type: 'int', nullable: true })
  currentSupply: number;

  @Column({ type: 'int', nullable: true })
  refillAlertAt: number;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column()
  careRecipientId: string;

  @ManyToOne(() => CareRecipient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'careRecipientId' })
  careRecipient: CareRecipient;

  @Column()
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @OneToMany(() => MedicationLog, (log) => log.medication)
  logs: MedicationLog[];
}

