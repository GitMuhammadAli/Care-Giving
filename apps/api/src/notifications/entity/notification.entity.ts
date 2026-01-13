import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../system/entity/base.entity';
import { User } from '../../user/entity/user.entity';
import { Family } from '../../family/entity/family.entity';

export enum NotificationType {
  MEDICATION_REMINDER = 'medication_reminder',
  MEDICATION_MISSED = 'medication_missed',
  APPOINTMENT_REMINDER = 'appointment_reminder',
  SHIFT_REMINDER = 'shift_reminder',
  EMERGENCY_ALERT = 'emergency_alert',
  FAMILY_INVITE = 'family_invite',
  TIMELINE_UPDATE = 'timeline_update',
  DOCUMENT_SHARED = 'document_shared',
  GENERAL = 'general',
}

export enum NotificationChannel {
  PUSH = 'push',
  EMAIL = 'email',
  SMS = 'sms',
  IN_APP = 'in_app',
}

@Entity('notifications')
@Index(['userId', 'isRead'])
@Index(['userId', 'createdAt'])
export class Notification extends BaseEntity {
  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @Column({
    type: 'enum',
    enum: NotificationChannel,
    default: NotificationChannel.IN_APP,
  })
  channel: NotificationChannel;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;

  @Column({ default: false })
  isSent: boolean;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ nullable: true })
  scheduledFor: Date;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  familyId: string;

  @ManyToOne(() => Family, { nullable: true })
  @JoinColumn({ name: 'familyId' })
  family: Family;
}

