import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User, UserStatus } from '../entity/user.entity';
import { ContextHelper } from '../../system/helper/context.helper';

@Injectable()
export class UserRepository extends Repository<User> {
  constructor(private dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  private getManager() {
    return ContextHelper.getTrx() || this.manager;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.getManager().findOne(User, {
      where: { email: email.toLowerCase() },
      relations: [],
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.getManager().findOne(User, {
      where: { id },
      relations: [],
    });
  }

  async findByIdWithFamilies(id: string): Promise<User | null> {
    return this.getManager().findOne(User, {
      where: { id },
      relations: ['familyMemberships', 'familyMemberships.family', 'familyMemberships.family.careRecipients'],
    });
  }

  async findActiveById(id: string): Promise<User | null> {
    return this.getManager().findOne(User, {
      where: { id, status: UserStatus.ACTIVE },
      relations: [],
    });
  }

  async createUser(data: Partial<User> & { password?: string }): Promise<User> {
    const { password, ...rest } = data as any;
    const user = this.getManager().create(User, {
      ...rest,
      email: data.email?.toLowerCase(),
      passwordHash: password || rest.passwordHash,
    });
    return this.getManager().save(User, user);
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    await this.getManager().update(User, id, data);
    return this.findById(id) as Promise<User>;
  }

  async incrementFailedAttempts(id: string): Promise<void> {
    await this.getManager().increment(User, { id }, 'failedLoginAttempts', 1);
  }

  async resetFailedAttempts(id: string): Promise<void> {
    await this.getManager().update(User, id, {
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
  }

  async lockUser(id: string, until: Date): Promise<void> {
    await this.getManager().update(User, id, { lockedUntil: until });
  }

  async setPasswordResetToken(id: string, token: string, expiresAt: Date): Promise<void> {
    await this.getManager().update(User, id, {
      passwordResetToken: token,
      passwordResetExpiresAt: expiresAt,
    });
  }

  async clearPasswordResetToken(id: string): Promise<void> {
    await this.getManager().update(User, id, {
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    });
  }

  async verifyEmail(id: string): Promise<void> {
    await this.getManager().update(User, id, {
      emailVerified: true,
      emailVerifiedAt: new Date(),
      status: UserStatus.ACTIVE,
    });
  }

  async updateLastLogin(id: string, ip?: string): Promise<void> {
    await this.getManager().update(User, id, {
      lastLoginAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
  }

  // Web Push Subscription methods
  async savePushSubscription(userId: string, subscription: any): Promise<void> {
    const PushToken = (await import('../entity/push-token.entity')).PushToken;
    const Platform = (await import('../entity/push-token.entity')).Platform;

    // Check if subscription already exists
    const existing = await this.getManager().findOne(PushToken, {
      where: { token: subscription.endpoint },
    });

    if (existing) {
      // Update existing subscription
      await this.getManager().update(PushToken, existing.id, {
        subscription,
        isActive: true,
        lastUsedAt: new Date(),
      });
    } else {
      // Create new subscription
      const pushToken = this.getManager().create(PushToken, {
        userId,
        token: subscription.endpoint,
        platform: Platform.WEB,
        subscription,
        isActive: true,
        lastUsedAt: new Date(),
      });
      await this.getManager().save(PushToken, pushToken);
    }
  }

  async getPushSubscriptions(userId: string): Promise<any[]> {
    const PushToken = (await import('../entity/push-token.entity')).PushToken;
    const Platform = (await import('../entity/push-token.entity')).Platform;

    const tokens = await this.getManager().find(PushToken, {
      where: {
        userId,
        platform: Platform.WEB,
        isActive: true,
      },
    });

    return tokens.map((token) => token.subscription).filter(Boolean);
  }

  async removePushSubscription(userId: string, endpoint: string): Promise<void> {
    const PushToken = (await import('../entity/push-token.entity')).PushToken;

    await this.getManager().update(
      PushToken,
      { userId, token: endpoint },
      { isActive: false }
    );
  }
}

