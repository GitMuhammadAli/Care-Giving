import { Injectable } from '@nestjs/common';
import { DataSource, Repository, In } from 'typeorm';
import { PushSubscription } from '../entity/push-subscription.entity';

@Injectable()
export class PushSubscriptionRepository extends Repository<PushSubscription> {
  constructor(private dataSource: DataSource) {
    super(PushSubscription, dataSource.createEntityManager());
  }

  async findByUser(userId: string): Promise<PushSubscription[]> {
    return this.find({
      where: { userId, isActive: true },
    });
  }

  async findByUsers(userIds: string[]): Promise<PushSubscription[]> {
    return this.find({
      where: { userId: In(userIds), isActive: true },
    });
  }

  async findByEndpoint(endpoint: string): Promise<PushSubscription | null> {
    return this.findOne({
      where: { endpoint },
    });
  }

  async deactivate(endpoint: string): Promise<void> {
    await this.update({ endpoint }, { isActive: false });
  }
}

