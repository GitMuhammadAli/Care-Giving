import {
  Entity,
  Column,
  OneToMany,
  Index,
  BeforeInsert,
  BeforeUpdate,
  PrimaryColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Session } from './session.entity';
import { PushToken } from './push-token.entity';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';

// Import FamilyMember type for relation (lazy loaded to avoid circular deps)
import type { FamilyMember } from '../../family/entity/family-member.entity';

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DEACTIVATED = 'DEACTIVATED',
}

@Entity('User')
@Index(['email'], { unique: true })
export class User {
  @PrimaryColumn('uuid')
  id: string;

  @Column()
  fullName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  passwordHash: string;

  // Getter/setter for backward compatibility with code using 'password'
  get password(): string {
    return this.passwordHash;
  }
  set password(value: string) {
    this.passwordHash = value;
  }

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ default: 'America/New_York' })
  timezone: string;

  @Column({ default: 'PENDING' })
  status: string;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ nullable: true, type: 'timestamptz' })
  emailVerifiedAt?: Date;

  @Column({ default: false })
  phoneVerified: boolean;

  @Column({ nullable: true, type: 'timestamptz' })
  phoneVerifiedAt?: Date;

  @Column({ nullable: true, type: 'timestamptz' })
  lastLoginAt?: Date;

  @Column({ default: 0 })
  failedLoginAttempts: number;

  @Column({ nullable: true, type: 'timestamptz' })
  lockedUntil?: Date;

  @Column({ nullable: true })
  @Exclude()
  passwordResetToken?: string;

  @Column({ nullable: true, type: 'timestamptz' })
  passwordResetExpiresAt?: Date;

  @Column({ nullable: true, type: 'timestamptz' })
  passwordChangedAt?: Date;

  @Column({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Session, (session) => session.user)
  sessions: Session[];

  @OneToMany(() => PushToken, (token) => token.user)
  pushTokens: PushToken[];

  // Family memberships - loaded lazily to avoid circular dependency
  @OneToMany('FamilyMember', 'user')
  familyMemberships?: FamilyMember[];

  @Column({ type: 'jsonb', nullable: true })
  preferences?: {
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
      emergencyOnly: boolean;
    };
    display: {
      theme: 'light' | 'dark' | 'system';
      language: string;
    };
  };

  @BeforeInsert()
  async hashPassword() {
    // Generate UUID if not provided
    if (!this.id) {
      this.id = randomUUID();
    }
    // Set timestamps
    const now = new Date();
    if (!this.createdAt) {
      this.createdAt = now;
    }
    this.updatedAt = now;
    // Hash password if not already hashed
    if (this.passwordHash && !this.passwordHash.startsWith('$argon2')) {
      this.passwordHash = await argon2.hash(this.passwordHash);
    }
  }

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }

  async validatePassword(password: string): Promise<boolean> {
    return argon2.verify(this.passwordHash, password);
  }

  isLocked(): boolean {
    if (!this.lockedUntil) return false;
    return new Date() < this.lockedUntil;
  }

  getPermissions(): string[] {
    return [];
  }
}
