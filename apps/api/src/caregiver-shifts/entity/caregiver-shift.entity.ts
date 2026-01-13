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

export enum ShiftStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

@Entity('caregiver_shifts')
@Index(['careRecipientId', 'startTime'])
@Index(['caregiverId', 'startTime'])
@Index(['status'])
export class CaregiverShift extends BaseEntity {
  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
  endTime: Date;

  @Column({
    type: 'enum',
    enum: ShiftStatus,
    default: ShiftStatus.SCHEDULED,
  })
  status: ShiftStatus;

  @Column({ type: 'timestamp', nullable: true })
  actualStartTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualEndTime: Date;

  @Column({ type: 'text', nullable: true })
  checkInNotes: string;

  @Column({ type: 'text', nullable: true })
  checkOutNotes: string;

  @Column({ type: 'text', nullable: true })
  handoffNotes: string;

  @Column({ nullable: true })
  checkInLocation: string;

  @Column({ nullable: true })
  checkOutLocation: string;

  @Column()
  caregiverId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'caregiverId' })
  caregiver: User;

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

