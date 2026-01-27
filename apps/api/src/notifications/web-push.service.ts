import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private isConfigured = false;

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
    this.isConfigured = true;
    this.logger.log('WebPush service initialized with VAPID keys');
  }

  /**
   * Subscribe user to push notifications
   * Stores the full subscription including encryption keys
   */
  async subscribe(userId: string, subscription: PushSubscriptionInput): Promise<void> {
    if (!subscription.keys?.p256dh || !subscription.keys?.auth) {
      this.logger.error('Invalid subscription: missing encryption keys');
      throw new Error('Invalid subscription: missing encryption keys');
    }

    try {
      await this.prisma.pushToken.upsert({
        where: { token: subscription.endpoint },
        create: {
          userId,
          token: subscription.endpoint,
          platform: 'WEB',
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        update: {
          userId,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
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
  ): Promise<{ success: number; failed: number }> {
    if (!this.isConfigured) {
      this.logger.warn('WebPush not configured, skipping notification');
      return { success: 0, failed: 0 };
    }

    const tokens = await this.prisma.pushToken.findMany({
      where: { userId, platform: 'WEB' },
    });

    if (!tokens || tokens.length === 0) {
      this.logger.debug(`No push subscriptions found for user ${userId}`);
      return { success: 0, failed: 0 };
    }

    let success = 0;
    let failed = 0;

    for (const token of tokens) {
      // Skip if missing encryption keys (legacy subscriptions)
      if (!token.p256dh || !token.auth) {
        this.logger.warn(`Subscription ${token.id} missing encryption keys, skipping`);
        failed++;
        continue;
      }

      const subscription: webpush.PushSubscription = {
        endpoint: token.token,
        keys: {
          p256dh: token.p256dh,
          auth: token.auth,
        },
      };

      try {
        await webpush.sendNotification(
          subscription,
          JSON.stringify(payload),
          {
            TTL: 60 * 60, // 1 hour
            urgency: payload.data?.type === 'EMERGENCY_ALERT' ? 'high' : 'normal',
          }
        );
        success++;
        this.logger.debug(`Push notification sent to user ${userId}`);
      } catch (error: any) {
        failed++;
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Subscription expired or no longer valid
          this.logger.warn(`Push subscription expired for user ${userId}, removing...`);
          await this.prisma.pushToken.delete({ where: { id: token.id } }).catch(() => {});
        } else {
          this.logger.error(
            `Failed to send push notification: ${error.message}`,
            error.body || error.statusCode
          );
        }
      }
    }

    this.logger.log(`Push notifications sent to user ${userId}: ${success} success, ${failed} failed`);
    return { success, failed };
  }

  /**
   * Send push notification to multiple users
   */
  async sendToMultiple(
    userIds: string[],
    payload: PushNotificationPayload
  ): Promise<{ success: number; failed: number }> {
    if (!this.isConfigured) {
      return { success: 0, failed: 0 };
    }

    this.logger.log(`Sending push notification to ${userIds.length} users`);

    let totalSuccess = 0;
    let totalFailed = 0;

    const results = await Promise.allSettled(
      userIds.map((userId) => this.sendNotification(userId, payload))
    );

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        totalSuccess += result.value.success;
        totalFailed += result.value.failed;
      } else {
        totalFailed++;
      }
    });

    return { success: totalSuccess, failed: totalFailed };
  }

  /**
   * Send emergency alert push notification (high priority)
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
      tag: `emergency-${alertId}`,
      requireInteraction: true, // Don't auto-dismiss
      data: {
        url: `/emergency/${alertId}`,
        type: 'EMERGENCY_ALERT',
        careRecipientName,
        alertId,
        timestamp: new Date().toISOString(),
      },
      actions: [
        {
          action: 'view',
          title: 'View Details',
          icon: '/icons/view-icon.png',
        },
        {
          action: 'acknowledge',
          title: 'Acknowledge',
          icon: '/icons/check-icon.png',
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
    careRecipientName: string,
    medicationId?: string
  ): Promise<void> {
    const payload: PushNotificationPayload = {
      title: '💊 Medication Reminder',
      body: `Time to take ${medicationName} (${dosage}) for ${careRecipientName}`,
      icon: '/icons/medication-icon.png',
      badge: '/icons/badge-72x72.png',
      tag: `medication-${medicationId || 'reminder'}`,
      data: {
        url: '/medications',
        type: 'MEDICATION_REMINDER',
        medicationName,
        careRecipientName,
        medicationId,
        timestamp: new Date().toISOString(),
      },
      actions: [
        {
          action: 'log',
          title: 'Mark as Taken',
          icon: '/icons/check-icon.png',
        },
        {
          action: 'snooze',
          title: 'Snooze 15min',
          icon: '/icons/snooze-icon.png',
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
    const timeStr = appointmentTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const payload: PushNotificationPayload = {
      title: '📅 Appointment Reminder',
      body: `${appointmentTitle} for ${careRecipientName} at ${timeStr}`,
      icon: '/icons/appointment-icon.png',
      badge: '/icons/badge-72x72.png',
      tag: `appointment-${appointmentId}`,
      data: {
        url: `/calendar?appointment=${appointmentId}`,
        type: 'APPOINTMENT_REMINDER',
        appointmentTitle,
        careRecipientName,
        appointmentId,
        appointmentTime: appointmentTime.toISOString(),
        timestamp: new Date().toISOString(),
      },
      actions: [
        {
          action: 'view',
          title: 'View Details',
          icon: '/icons/view-icon.png',
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/dismiss-icon.png',
        },
      ],
    };

    await this.sendToMultiple(userIds, payload);
  }

  /**
   * Send shift reminder push notification
   */
  async sendShiftReminder(
    userId: string,
    careRecipientName: string,
    shiftStart: Date,
    shiftId: string
  ): Promise<void> {
    const timeStr = shiftStart.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const payload: PushNotificationPayload = {
      title: '👨‍⚕️ Shift Reminder',
      body: `Your shift for ${careRecipientName} starts at ${timeStr}`,
      icon: '/icons/shift-icon.png',
      badge: '/icons/badge-72x72.png',
      tag: `shift-${shiftId}`,
      data: {
        url: `/shifts/${shiftId}`,
        type: 'SHIFT_REMINDER',
        careRecipientName,
        shiftId,
        shiftStart: shiftStart.toISOString(),
        timestamp: new Date().toISOString(),
      },
      actions: [
        {
          action: 'checkin',
          title: 'Check In',
          icon: '/icons/checkin-icon.png',
        },
      ],
    };

    await this.sendNotification(userId, payload);
  }

  /**
   * Send generic notification
   */
  async sendGenericNotification(
    userIds: string[],
    title: string,
    body: string,
    url?: string,
    data?: Record<string, any>
  ): Promise<void> {
    const payload: PushNotificationPayload = {
      title,
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: {
        url: url || '/',
        type: 'GENERAL',
        ...data,
        timestamp: new Date().toISOString(),
      },
    };

    await this.sendToMultiple(userIds, payload);
  }

  /**
   * Send chat message notification
   */
  async sendChatNotification(
    userId: string,
    senderName: string,
    message: string,
    familyId: string,
    channelId: string
  ): Promise<void> {
    const payload: PushNotificationPayload = {
      title: `💬 ${senderName}`,
      body: message.length > 100 ? message.substring(0, 100) + '...' : message,
      icon: '/icons/chat-icon.png',
      badge: '/icons/badge-72x72.png',
      tag: `chat-${channelId}`,
      data: {
        url: `/chat?family=${familyId}`,
        type: 'CHAT_MESSAGE',
        senderName,
        familyId,
        channelId,
        timestamp: new Date().toISOString(),
      },
      actions: [
        {
          action: 'reply',
          title: 'Reply',
          icon: '/icons/reply-icon.png',
        },
        {
          action: 'view',
          title: 'View Chat',
          icon: '/icons/view-icon.png',
        },
      ],
    };

    await this.sendNotification(userId, payload);
  }
}
