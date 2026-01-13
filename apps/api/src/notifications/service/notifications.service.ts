import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as webpush from 'web-push';
import { Notification, NotificationType, NotificationChannel } from '../entity/notification.entity';
import { PushSubscription, PushPlatform } from '../entity/push-subscription.entity';
import { NotificationRepository } from '../repository/notification.repository';
import { PushSubscriptionRepository } from '../repository/push-subscription.repository';
import { ContextHelper } from '../../system/helper/context.helper';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationRepository)
    private readonly notificationRepository: NotificationRepository,
    @InjectRepository(PushSubscriptionRepository)
    private readonly pushSubRepository: PushSubscriptionRepository,
    private readonly configService: ConfigService,
    @InjectQueue('notifications') private readonly notificationQueue: Queue,
  ) {
    // Configure web-push
    const vapidPublicKey = this.configService.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY');
    const vapidPrivateKey = this.configService.get('VAPID_PRIVATE_KEY');
    const vapidSubject = this.configService.get('VAPID_SUBJECT');

    if (vapidPublicKey && vapidPrivateKey && vapidSubject) {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    }
  }

  // In-app notifications
  async create(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>,
    familyId?: string,
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId,
      type,
      title,
      body,
      data,
      familyId,
      channel: NotificationChannel.IN_APP,
    });

    return this.notificationRepository.save(notification);
  }

  async findByUser(userId: string, limit = 50, offset = 0): Promise<Notification[]> {
    return this.notificationRepository.findByUser(userId, limit, offset);
  }

  async findUnread(userId: string): Promise<Notification[]> {
    return this.notificationRepository.findUnread(userId);
  }

  async countUnread(userId: string): Promise<number> {
    return this.notificationRepository.countUnread(userId);
  }

  async markAsRead(notificationIds: string[]): Promise<void> {
    const user = ContextHelper.getUser();
    await this.notificationRepository.markAsRead(user.id, notificationIds);
  }

  async markAllAsRead(): Promise<void> {
    const user = ContextHelper.getUser();
    await this.notificationRepository.markAllAsRead(user.id);
  }

  // Push subscriptions
  async subscribeToPush(dto: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    platform?: PushPlatform;
    deviceName?: string;
  }): Promise<PushSubscription> {
    const user = ContextHelper.getUser();

    // Check if already exists
    let subscription = await this.pushSubRepository.findByEndpoint(dto.endpoint);

    if (subscription) {
      // Update existing
      subscription.keys = dto.keys;
      subscription.isActive = true;
      return this.pushSubRepository.save(subscription);
    }

    // Create new
    subscription = this.pushSubRepository.create({
      ...dto,
      userId: user.id,
      platform: dto.platform || PushPlatform.WEB,
    });

    return this.pushSubRepository.save(subscription);
  }

  async unsubscribeFromPush(endpoint: string): Promise<void> {
    await this.pushSubRepository.deactivate(endpoint);
  }

  // Send push notification
  async sendPushNotification(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    const subscriptions = await this.pushSubRepository.findByUsers(userIds);

    const payload = JSON.stringify({
      title,
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data,
    });

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          payload,
        );
      } catch (error: any) {
        // Remove invalid subscriptions
        if (error.statusCode === 410 || error.statusCode === 404) {
          await this.pushSubRepository.deactivate(sub.endpoint);
        }
        console.error('Push notification failed:', error.message);
      }
    });

    await Promise.allSettled(sendPromises);
  }

  // Send notification to family
  async notifyFamily(
    familyId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>,
    excludeUserId?: string,
  ): Promise<void> {
    // Queue the notification for processing
    await this.notificationQueue.add('notify-family', {
      familyId,
      type,
      title,
      body,
      data,
      excludeUserId,
    });
  }

  // Send emergency alert
  async sendEmergencyAlert(
    userIds: string[],
    careRecipientName: string,
    alertType: string,
    location?: string,
  ): Promise<void> {
    const title = '🚨 EMERGENCY ALERT';
    const body = `${careRecipientName}: ${alertType}${location ? ` at ${location}` : ''}`;

    // Send push immediately for emergencies
    await this.sendPushNotification(userIds, title, body, {
      type: 'emergency',
      requireInteraction: true,
    });

    // Also create in-app notifications
    for (const userId of userIds) {
      await this.create(
        userId,
        NotificationType.EMERGENCY_ALERT,
        title,
        body,
        { type: 'emergency' },
      );
    }
  }
}

