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

export enum AppointmentType {
  DOCTOR_VISIT = 'doctor_visit',
  SPECIALIST = 'specialist',
  LAB_WORK = 'lab_work',
  IMAGING = 'imaging',
  PHYSICAL_THERAPY = 'physical_therapy',
  DENTAL = 'dental',
  VISION = 'vision',
  OTHER = 'other',
}

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum RecurrencePattern {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
}

@Entity('appointments')
@Index(['careRecipientId', 'dateTime'])
@Index(['dateTime'])
export class Appointment extends BaseEntity {
  @Column()
  title: string;

  @Column({
    type: 'enum',
    enum: AppointmentType,
    default: AppointmentType.DOCTOR_VISIT,
  })
  type: AppointmentType;

  @Column({ nullable: true })
  doctorName: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  address: string;

  @Column({ type: 'timestamp' })
  dateTime: Date;

  @Column({ default: 60 })
  duration: number; // in minutes

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.SCHEDULED,
  })
  status: AppointmentStatus;

  @Column({
    type: 'enum',
    enum: RecurrencePattern,
    default: RecurrencePattern.NONE,
  })
  recurrence: RecurrencePattern;

  @Column({ type: 'timestamp', nullable: true })
  recurrenceEndDate: Date;

  @Column({ nullable: true })
  recurrenceRuleId: string; // For grouping recurring appointments

  @Column({ type: 'simple-array', nullable: true })
  reminderBefore: string[]; // ['1day', '1hour', '30min']

  @Column({ nullable: true })
  transportAssignedToId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'transportAssignedToId' })
  transportAssignedTo: User;

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
}

