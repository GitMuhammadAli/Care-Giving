import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../gateway/events.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private gateway: EventsGateway,
  ) {}

  async notifyEmergency(familyId: string, careRecipientId: string, alert: any) {
    const careRecipient = await this.prisma.careRecipient.findUnique({
      where: { id: careRecipientId },
    });

    if (!careRecipient) return;

    const notification = {
      type: 'EMERGENCY_ALERT',
      title: `🚨 EMERGENCY: ${alert.title}`,
      body: `${careRecipient.preferredName || careRecipient.fullName}: ${alert.description}`,
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
        name: careRecipient.preferredName || careRecipient.fullName,
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
  }

  async notifyHighSeverityEntry(familyId: string, careRecipient: any, entry: any) {
    const notification = {
      type: 'TIMELINE_UPDATE',
      title: `⚠️ ${entry.type}: ${entry.title}`,
      body: `${careRecipient.preferredName || careRecipient.fullName} - ${entry.description || 'New entry logged'}`,
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
        name: careRecipient.preferredName || careRecipient.fullName,
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
  }

  async notifyShiftAssigned(shift: any) {
    await this.prisma.notification.create({
      data: {
        userId: shift.caregiverId,
        type: 'SHIFT_REMINDER',
        title: '📅 New Shift Assigned',
        body: `You have been assigned a shift for ${shift.careRecipient.preferredName || shift.careRecipient.fullName}`,
        data: {
          type: 'SHIFT',
          shiftId: shift.id,
          careRecipientId: shift.careRecipientId,
        },
      },
    });

    this.gateway.emitToUser(shift.caregiverId, 'shift_assigned', shift);
  }

  async notifyShiftHandoff(fromUser: any, toUser: any, careRecipient: any, notes?: string) {
    await this.prisma.notification.create({
      data: {
        userId: toUser.id,
        type: 'SHIFT_HANDOFF',
        title: '🔄 Shift Handoff',
        body: `${fromUser.fullName} has completed their shift for ${careRecipient.preferredName || careRecipient.fullName}`,
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
  }

  async notifyMedicationReminder(medication: any, careRecipient: any, caregiverId: string) {
    await this.prisma.notification.create({
      data: {
        userId: caregiverId,
        type: 'MEDICATION_REMINDER',
        title: '💊 Medication Due',
        body: `${careRecipient.preferredName || careRecipient.fullName}: ${medication.name} ${medication.dosage}`,
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
  }

  async notifyAppointmentReminder(appointment: any, careRecipient: any, familyId: string) {
    const notification = {
      type: 'APPOINTMENT_REMINDER',
      title: '📅 Appointment Reminder',
      body: `${careRecipient.preferredName || careRecipient.fullName}: ${appointment.title} is coming up`,
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
  }

  async notifyMedicationRefillNeeded(medication: any, careRecipient: any, familyId: string) {
    const notification = {
      type: 'REFILL_NEEDED',
      title: '⚠️ Medication Refill Needed',
      body: `${careRecipient.preferredName || careRecipient.fullName}: ${medication.name} is running low (${medication.currentSupply} remaining)`,
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

