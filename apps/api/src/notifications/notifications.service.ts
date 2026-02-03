import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../gateway/events.gateway';
import { WebPushService } from './web-push.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private gateway: EventsGateway,
    private webPushService: WebPushService,
  ) {}

  async notifyEmergency(familyId: string, careRecipientId: string, alert: any) {
    const careRecipient = await this.prisma.careRecipient.findUnique({
      where: { id: careRecipientId },
    });

    if (!careRecipient) return;

    const careRecipientName = careRecipient.preferredName || careRecipient.fullName;
    const notification = {
      type: 'EMERGENCY_ALERT',
      title: `🚨 EMERGENCY: ${alert.title}`,
      body: `${careRecipientName}: ${alert.description}`,
      data: {
        type: 'EMERGENCY',
        careRecipientId,
        alertId: alert.id,
      },
    };

    // Real-time socket notification
    this.gateway.emitToFamily(familyId, 'emergency', {
      alert,
      careRecipient: {
        id: careRecipient.id,
        name: careRecipientName,
      },
    });

    // Create in-app notifications for all family members
    const members = await this.prisma.familyMember.findMany({
      where: { familyId },
    });

    await this.prisma.notification.createMany({
      data: members.map((m) => ({
        userId: m.userId,
        type: 'EMERGENCY_ALERT',
        title: notification.title,
        body: notification.body,
        data: notification.data,
      })),
    });

    // Send push notifications to all family members
    const userIds = members.map((m) => m.userId);
    try {
      await this.webPushService.sendEmergencyAlert(
        userIds,
        careRecipientName,
        alert.description,
        alert.id,
      );
      this.logger.log(`Emergency push notifications sent to ${userIds.length} users`);
    } catch (error) {
      this.logger.error('Failed to send emergency push notifications', error);
    }
  }

  async notifyHighSeverityEntry(familyId: string, careRecipient: any, entry: any) {
    const careRecipientName = careRecipient.preferredName || careRecipient.fullName;
    const notification = {
      type: 'TIMELINE_UPDATE',
      title: `⚠️ ${entry.type}: ${entry.title}`,
      body: `${careRecipientName} - ${entry.description || 'New entry logged'}`,
      data: {
        type: 'TIMELINE',
        careRecipientId: careRecipient.id,
        entryId: entry.id,
      },
    };

    this.gateway.emitToFamily(familyId, 'timeline_update', {
      entry,
      careRecipient: {
        id: careRecipient.id,
        name: careRecipientName,
      },
    });

    const members = await this.prisma.familyMember.findMany({
      where: { familyId },
    });

    await this.prisma.notification.createMany({
      data: members.map((m) => ({
        userId: m.userId,
        type: 'TIMELINE_UPDATE',
        title: notification.title,
        body: notification.body,
        data: notification.data,
      })),
    });

    // Send push notifications for high severity entries
    const userIds = members.map((m) => m.userId);
    try {
      await this.webPushService.sendGenericNotification(
        userIds,
        notification.title,
        notification.body,
        `/timeline/${careRecipient.id}`,
        { entryId: entry.id, severity: entry.severity },
      );
    } catch (error) {
      this.logger.error('Failed to send timeline push notifications', error);
    }
  }

  async notifyShiftAssigned(shift: any) {
    const careRecipientName = shift.careRecipient.preferredName || shift.careRecipient.fullName;
    const title = '📅 New Shift Assigned';
    const body = `You have been assigned a shift for ${careRecipientName}`;

    await this.prisma.notification.create({
      data: {
        userId: shift.caregiverId,
        type: 'SHIFT_REMINDER',
        title,
        body,
        data: {
          type: 'SHIFT',
          shiftId: shift.id,
          careRecipientId: shift.careRecipientId,
        },
      },
    });

    this.gateway.emitToUser(shift.caregiverId, 'shift_assigned', shift);

    // Send push notification
    try {
      await this.webPushService.sendShiftReminder(
        shift.caregiverId,
        careRecipientName,
        new Date(shift.startTime),
        shift.id,
      );
    } catch (error) {
      this.logger.error('Failed to send shift assignment push notification', error);
    }
  }

  async notifyShiftHandoff(fromUser: any, toUser: any, careRecipient: any, notes?: string) {
    const careRecipientName = careRecipient.preferredName || careRecipient.fullName;
    const title = '🔄 Shift Handoff';
    const body = `${fromUser.fullName} has completed their shift for ${careRecipientName}`;

    await this.prisma.notification.create({
      data: {
        userId: toUser.id,
        type: 'SHIFT_HANDOFF',
        title,
        body,
        data: {
          type: 'HANDOFF',
          careRecipientId: careRecipient.id,
          notes,
        },
      },
    });

    this.gateway.emitToUser(toUser.id, 'shift_handoff', {
      from: fromUser,
      careRecipient,
      notes,
    });

    // Send push notification
    try {
      await this.webPushService.sendGenericNotification(
        [toUser.id],
        title,
        body,
        `/shifts`,
        { type: 'HANDOFF', careRecipientId: careRecipient.id },
      );
    } catch (error) {
      this.logger.error('Failed to send shift handoff push notification', error);
    }
  }

  async notifyMedicationReminder(medication: any, careRecipient: any, caregiverId: string) {
    const careRecipientName = careRecipient.preferredName || careRecipient.fullName;

    await this.prisma.notification.create({
      data: {
        userId: caregiverId,
        type: 'MEDICATION_REMINDER',
        title: '💊 Medication Due',
        body: `${careRecipientName}: ${medication.name} ${medication.dosage}`,
        data: {
          type: 'MEDICATION',
          medicationId: medication.id,
          careRecipientId: careRecipient.id,
        },
      },
    });

    this.gateway.emitToUser(caregiverId, 'medication_reminder', {
      medication,
      careRecipient,
    });

    // Send push notification
    try {
      await this.webPushService.sendMedicationReminder(
        caregiverId,
        medication.name,
        medication.dosage,
        careRecipientName,
        medication.id,
      );
    } catch (error) {
      this.logger.error('Failed to send medication reminder push notification', error);
    }
  }

  async notifyAppointmentReminder(appointment: any, careRecipient: any, familyId: string) {
    const careRecipientName = careRecipient.preferredName || careRecipient.fullName;
    const notification = {
      type: 'APPOINTMENT_REMINDER',
      title: '📅 Appointment Reminder',
      body: `${careRecipientName}: ${appointment.title} is coming up`,
      data: {
        type: 'APPOINTMENT',
        appointmentId: appointment.id,
        careRecipientId: careRecipient.id,
      },
    };

    this.gateway.emitToFamily(familyId, 'appointment_reminder', {
      appointment,
      careRecipient,
    });

    const members = await this.prisma.familyMember.findMany({
      where: { familyId },
    });

    await this.prisma.notification.createMany({
      data: members.map((m) => ({
        userId: m.userId,
        type: 'APPOINTMENT_REMINDER',
        title: notification.title,
        body: notification.body,
        data: notification.data,
      })),
    });

    // Send push notifications to all family members
    const userIds = members.map((m) => m.userId);
    try {
      await this.webPushService.sendAppointmentReminder(
        userIds,
        appointment.title,
        careRecipientName,
        new Date(appointment.startTime),
        appointment.id,
      );
    } catch (error) {
      this.logger.error('Failed to send appointment push notifications', error);
    }
  }

  async notifyMedicationRefillNeeded(medication: any, careRecipient: any, familyId: string) {
    const careRecipientName = careRecipient.preferredName || careRecipient.fullName;
    const notification = {
      type: 'REFILL_NEEDED',
      title: '⚠️ Medication Refill Needed',
      body: `${careRecipientName}: ${medication.name} is running low (${medication.currentSupply} remaining)`,
      data: {
        type: 'REFILL',
        medicationId: medication.id,
        careRecipientId: careRecipient.id,
        currentSupply: medication.currentSupply,
      },
    };

    this.gateway.emitToFamily(familyId, 'medication_refill_needed', {
      medication,
      careRecipient,
    });

    const members = await this.prisma.familyMember.findMany({
      where: { familyId },
    });

    await this.prisma.notification.createMany({
      data: members.map((m) => ({
        userId: m.userId,
        type: 'REFILL_NEEDED',
        title: notification.title,
        body: notification.body,
        data: notification.data,
      })),
    });

    // Send push notifications for refill alerts
    const userIds = members.map((m) => m.userId);
    try {
      await this.webPushService.sendGenericNotification(
        userIds,
        notification.title,
        notification.body,
        `/medications/${medication.id}`,
        { medicationId: medication.id, currentSupply: medication.currentSupply },
      );
    } catch (error) {
      this.logger.error('Failed to send refill push notifications', error);
    }
  }

  /**
   * Create a notification (used by scheduler and other services)
   */
  async create(data: {
    userId: string;
    title: string;
    body: string;
    type: string;
    priority?: string;
    data?: Record<string, any>;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        priority: data.priority || 'NORMAL',
        data: data.data || {},
      },
    });

    // Emit real-time notification
    this.gateway.emitToUser(data.userId, 'notification', notification);

    // Try to send push notification
    try {
      await this.webPushService.sendGenericNotification(
        [data.userId],
        data.title,
        data.body,
        '/',
        data.data || {},
      );
    } catch (error) {
      // Push notification failure shouldn't fail the whole operation
      this.logger.debug(`Push notification failed for user ${data.userId}: ${error.message}`);
    }

    return notification;
  }

  async getNotifications(userId: string, unreadOnly: boolean = false, limit: number = 50) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { read: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  async markMultipleAsRead(notificationIds: string[], userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  async getUnread(userId: string) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        read: false,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }

  async registerPushToken(userId: string, token: string, platform: 'WEB' | 'IOS' | 'ANDROID') {
    await this.prisma.pushToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform },
    });

    return { success: true };
  }

  async removePushToken(token: string) {
    await this.prisma.pushToken.deleteMany({
      where: { token },
    });

    return { success: true };
  }
}


