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

export enum TimelineEntryType {
  NOTE = 'note',
  VITALS = 'vitals',
  INCIDENT = 'incident',
  MOOD = 'mood',
  MEAL = 'meal',
  ACTIVITY = 'activity',
  SLEEP = 'sleep',
  SYMPTOM = 'symptom',
  MEDICATION = 'medication',
  APPOINTMENT = 'appointment',
}

@Entity('timeline_entries')
@Index(['careRecipientId', 'createdAt'])
@Index(['type', 'createdAt'])
export class TimelineEntry extends BaseEntity {
  @Column({
    type: 'enum',
    enum: TimelineEntryType,
  })
  type: TimelineEntryType;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Vitals data
  @Column({ type: 'jsonb', nullable: true })
  vitals: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    bloodSugar?: number;
    oxygenLevel?: number;
    weight?: number;
  };

  // Additional metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    mood?: string;
    activityType?: string;
    activityDuration?: number;
    sleepQuality?: string;
    sleepDuration?: number;
    mealType?: string;
    mealDescription?: string;
    severity?: string;
    relatedEntityId?: string;
    relatedEntityType?: string;
  };

  @Column({ type: 'simple-array', nullable: true })
  attachments: string[]; // URLs to images/files

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

