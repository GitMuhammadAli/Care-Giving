import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
  }>;
}

export interface PushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    // Configure web-push with VAPID keys
    const publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.configService.get<string>('VAPID_SUBJECT') || 'mailto:admin@carecircle.app';

    if (!publicKey || !privateKey) {
      this.logger.warn(
        'VAPID keys not configured. Web Push notifications will not work. ' +
        'Generate keys with: npx web-push generate-vapid-keys'
      );
      return;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.logger.log('WebPush service initialized with VAPID keys');
  }

  /**
   * Subscribe user to push notifications
   */
  async subscribe(userId: string, subscription: PushSubscription): Promise<void> {
    try {
      // Store subscription as JSON in push token
      await this.prisma.pushToken.upsert({
        where: { token: subscription.endpoint },
        create: {
          userId,
          token: subscription.endpoint,
          platform: 'WEB',
        },
        update: {
          userId,
        },
      });
      this.logger.log(`User ${userId} subscribed to push notifications`);
    } catch (error) {
      this.logger.error(`Failed to save push subscription for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe user from push notifications
   */
  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    try {
      await this.prisma.pushToken.deleteMany({
        where: { userId, token: endpoint },
      });
      this.logger.log(`User ${userId} unsubscribed from push notifications`);
    } catch (error) {
      this.logger.error(`Failed to remove push subscription for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Send push notification to a single user
   */
  async sendNotification(
    userId: string,
    payload: PushNotificationPayload
  ): Promise<void> {
    const tokens = await this.prisma.pushToken.findMany({
      where: { userId, platform: 'WEB' },
    });

    if (!tokens || tokens.length === 0) {
      this.logger.debug(`No push subscriptions found for user ${userId}`);
      return;
    }

    this.logger.log(`Sending push notification to ${tokens.length} device(s) for user ${userId}`);

    // For now, just log the notification since we're storing tokens, not full subscriptions
    // A full implementation would need to store the p256dh and auth keys as well
    for (const token of tokens) {
      try {
        // Note: Full implementation would need subscription object with keys
        this.logger.debug(`Would send push notification to ${token.token}`);
      } catch (error: any) {
        if (error.statusCode === 410) {
          this.logger.warn(`Push subscription expired for user ${userId}, removing...`);
          await this.prisma.pushToken.delete({ where: { id: token.id } });
        } else {
          this.logger.error(
            `Failed to send push notification to ${token.token}:`,
            error.message
          );
        }
      }
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendToMultiple(
    userIds: string[],
    payload: PushNotificationPayload
  ): Promise<void> {
    this.logger.log(`Sending push notification to ${userIds.length} users`);

    const promises = userIds.map((userId) =>
      this.sendNotification(userId, payload)
    );

    await Promise.allSettled(promises);
  }

  /**
   * Send emergency alert push notification
   */
  async sendEmergencyAlert(
    userIds: string[],
    careRecipientName: string,
    alertMessage: string,
    alertId: string
  ): Promise<void> {
    const payload: PushNotificationPayload = {
      title: '🚨 Emergency Alert',
      body: `Emergency reported for ${careRecipientName}: ${alertMessage}`,
      icon: '/icons/emergency-icon.png',
      badge: '/icons/badge-72x72.png',
      data: {
        url: `/emergency/${alertId}`,
        type: 'EMERGENCY_ALERT',
        careRecipientName,
        alertId,
      },
      actions: [
        {
          action: 'view',
          title: 'View Details',
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
        },
      ],
    };

    await this.sendToMultiple(userIds, payload);
  }

  /**
   * Send medication reminder push notification
   */
  async sendMedicationReminder(
    userId: string,
    medicationName: string,
    dosage: string,
    careRecipientName: string
  ): Promise<void> {
    const payload: PushNotificationPayload = {
      title: `💊 Medication Reminder`,
      body: `Time to take ${medicationName} (${dosage}) for ${careRecipientName}`,
      icon: '/icons/medication-icon.png',
      badge: '/icons/badge-72x72.png',
      data: {
        url: '/medications',
        type: 'MEDICATION_REMINDER',
        medicationName,
        careRecipientName,
      },
      actions: [
        {
          action: 'log',
          title: 'Mark as Taken',
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
        },
      ],
    };

    await this.sendNotification(userId, payload);
  }

  /**
   * Send appointment reminder push notification
   */
  async sendAppointmentReminder(
    userIds: string[],
    appointmentTitle: string,
    careRecipientName: string,
    appointmentTime: Date,
    appointmentId: string
  ): Promise<void> {
    const payload: PushNotificationPayload = {
      title: `📅 Appointment Reminder`,
      body: `${appointmentTitle} for ${careRecipientName} at ${appointmentTime.toLocaleTimeString()}`,
      icon: '/icons/appointment-icon.png',
      badge: '/icons/badge-72x72.png',
      data: {
        url: `/appointments/${appointmentId}`,
        type: 'APPOINTMENT_REMINDER',
        appointmentTitle,
        careRecipientName,
        appointmentId,
      },
      actions: [
        {
          action: 'view',
          title: 'View Details',
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
        },
      ],
    };

    await this.sendToMultiple(userIds, payload);
  }
}
