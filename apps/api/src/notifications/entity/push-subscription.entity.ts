import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../system/entity/base.entity';
import { User } from '../../user/entity/user.entity';

export enum PushPlatform {
  WEB = 'web',
  IOS = 'ios',
  ANDROID = 'android',
}

@Entity('push_subscriptions')
@Index(['userId'])
@Unique(['endpoint'])
export class PushSubscription extends BaseEntity {
  @Column()
  endpoint: string;

  @Column({ type: 'jsonb' })
  keys: {
    p256dh: string;
    auth: string;
  };

  @Column({
    type: 'enum',
    enum: PushPlatform,
    default: PushPlatform.WEB,
  })
  platform: PushPlatform;

  @Column({ nullable: true })
  deviceName: string;

  @Column({ default: true })
  isActive: boolean;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}

