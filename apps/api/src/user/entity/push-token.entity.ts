import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntityWithoutSoftDelete } from '../../system/entity/base.entity';
import { User } from './user.entity';

export enum Platform {
  IOS = 'IOS',
  ANDROID = 'ANDROID',
  WEB = 'WEB',
}

@Entity('push_tokens')
@Index(['userId'])
@Index(['token'], { unique: true })
export class PushToken extends BaseEntityWithoutSoftDelete {
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.pushTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ unique: true })
  token: string;

  @Column({ type: 'enum', enum: Platform })
  platform: Platform;

  @Column({ nullable: true })
  deviceId?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true, type: 'timestamptz' })
  lastUsedAt?: Date;

  // Web Push Subscription (for Platform.WEB only)
  @Column({ type: 'jsonb', nullable: true })
  subscription?: {
    endpoint: string;
    expirationTime?: number | null;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
}

