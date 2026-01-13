import { Injectable } from '@nestjs/common';
import { DataSource, Repository, LessThanOrEqual } from 'typeorm';
import { Notification, NotificationType } from '../entity/notification.entity';

@Injectable()
export class NotificationRepository extends Repository<Notification> {
  constructor(private dataSource: DataSource) {
    super(Notification, dataSource.createEntityManager());
  }

  async findByUser(userId: string, limit = 50, offset = 0): Promise<Notification[]> {
    return this.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async findUnread(userId: string): Promise<Notification[]> {
    return this.find({
      where: { userId, isRead: false },
      order: { createdAt: 'DESC' },
    });
  }

  async countUnread(userId: string): Promise<number> {
    return this.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(userId: string, notificationIds: string[]): Promise<void> {
    await this.update(
      { userId, id: notificationIds as any },
      { isRead: true, readAt: new Date() },
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  async findScheduledToSend(): Promise<Notification[]> {
    return this.find({
      where: {
        isSent: false,
        scheduledFor: LessThanOrEqual(new Date()),
      },
      relations: ['user'],
    });
  }
}

