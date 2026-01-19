import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../system/module/cache';
import { EventPublisherService } from '../events/publishers/event-publisher.service';
import { ROUTING_KEYS } from '../events/events.constants';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AssignTransportDto } from './dto/assign-transport.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { addMonths, startOfDay, endOfDay, format } from 'date-fns';

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private eventEmitter: EventEmitter2,
    private eventPublisher: EventPublisherService,
    @Inject(forwardRef(() => NotificationsService))
    private notifications: NotificationsService,
  ) {}

  private async verifyAccess(careRecipientId: string, userId: string) {
    const careRecipient = await this.prisma.careRecipient.findUnique({
      where: { id: careRecipientId },
    });

    if (!careRecipient) {
      throw new NotFoundException('Care recipient not found');
    }

    const membership = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId: careRecipient.familyId, userId } },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this care recipient');
    }

    return { careRecipient, membership };
  }

  async create(careRecipientId: string, userId: string, dto: CreateAppointmentDto) {
    const { membership } = await this.verifyAccess(careRecipientId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot create appointments');
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        careRecipientId,
        doctorId: dto.doctorId,
        title: dto.title,
        type: dto.type,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        location: dto.location,
        address: dto.address,
        notes: dto.notes,
        isRecurring: dto.isRecurring || false,
        recurrenceRule: dto.recurrenceRule,
        reminderMinutes: dto.reminderMinutes || [60, 1440],
      },
      include: {
        doctor: true,
        transportAssignment: true,
      },
    });

    // Invalidate cache
    await this.invalidateAppointmentCache(careRecipientId);

    // Emit event for WebSocket broadcast
    this.eventEmitter.emit('appointment.created', appointment);

    return appointment;
  }

  async findAll(careRecipientId: string, userId: string, options?: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
  }) {
    await this.verifyAccess(careRecipientId, userId);

    const where: any = { careRecipientId };

    if (options?.startDate || options?.endDate) {
      where.startTime = {};
      if (options?.startDate) {
        where.startTime.gte = options.startDate;
      }
      if (options?.endDate) {
        where.startTime.lte = options.endDate;
      }
    }

    if (options?.status) {
      where.status = options.status;
    }

    return this.prisma.appointment.findMany({
      where,
      include: {
        doctor: true,
        transportAssignment: true,
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async findUpcoming(careRecipientId: string, userId: string, days: number = 30) {
    await this.verifyAccess(careRecipientId, userId);

    const cacheKey = CACHE_KEYS.APPOINTMENTS_UPCOMING(careRecipientId);

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const now = new Date();
        const endDate = addMonths(now, 1);

        return this.prisma.appointment.findMany({
          where: {
            careRecipientId,
            startTime: { gte: now, lte: endDate },
            status: { in: ['SCHEDULED', 'CONFIRMED'] },
          },
          include: {
            doctor: true,
            transportAssignment: true,
          },
          orderBy: { startTime: 'asc' },
        });
      },
      CACHE_TTL.APPOINTMENTS_UPCOMING,
    );
  }

  async findForDay(careRecipientId: string, userId: string, date: Date) {
    await this.verifyAccess(careRecipientId, userId);

    const dateStr = format(date, 'yyyy-MM-dd');
    const cacheKey = CACHE_KEYS.APPOINTMENTS_DAY(careRecipientId, dateStr);

    return this.cacheService.getOrSet(
      cacheKey,
      () =>
        this.prisma.appointment.findMany({
          where: {
            careRecipientId,
            startTime: { gte: startOfDay(date), lte: endOfDay(date) },
          },
          include: {
            doctor: true,
            transportAssignment: true,
          },
          orderBy: { startTime: 'asc' },
        }),
      CACHE_TTL.APPOINTMENTS_DAY,
    );
  }

  async findOne(id: string, userId: string) {
    const cacheKey = CACHE_KEYS.APPOINTMENT(id);

    const appointment = await this.cacheService.getOrSet(
      cacheKey,
      () =>
        this.prisma.appointment.findUnique({
          where: { id },
          include: {
            careRecipient: true,
            doctor: true,
            transportAssignment: true,
          },
        }),
      CACHE_TTL.APPOINTMENT,
    );

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    await this.verifyAccess(appointment.careRecipientId, userId);

    return appointment;
  }

  async update(id: string, userId: string, dto: UpdateAppointmentDto) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const { membership } = await this.verifyAccess(appointment.careRecipientId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot update appointments');
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        doctorId: dto.doctorId,
        title: dto.title,
        type: dto.type,
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
        endTime: dto.endTime ? new Date(dto.endTime) : undefined,
        location: dto.location,
        address: dto.address,
        notes: dto.notes,
        status: dto.status,
        reminderMinutes: dto.reminderMinutes,
      },
      include: {
        doctor: true,
        transportAssignment: true,
      },
    });

    // Invalidate cache
    await this.invalidateAppointmentCache(appointment.careRecipientId, id);

    // Emit event for WebSocket broadcast
    this.eventEmitter.emit('appointment.updated', updated);

    return updated;
  }

  async cancel(id: string, userId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const { membership } = await this.verifyAccess(appointment.careRecipientId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot cancel appointments');
    }

    const cancelled = await this.prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    // Invalidate cache
    await this.invalidateAppointmentCache(appointment.careRecipientId, id);

    return cancelled;
  }

  async delete(id: string, userId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        careRecipient: {
          select: { id: true, fullName: true, preferredName: true, familyId: true },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const { membership } = await this.verifyAccess(appointment.careRecipientId, userId);

    if (membership.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can delete appointments');
    }

    // Get admin info and family members before deletion
    const admin = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });

    const familyMembers = await this.prisma.familyMember.findMany({
      where: { familyId: appointment.careRecipient.familyId },
      select: { userId: true },
    });

    // Publish event BEFORE deletion
    await this.eventPublisher.publish(
      ROUTING_KEYS.APPOINTMENT_DELETED,
      {
        appointmentId: id,
        appointmentTitle: appointment.title,
        careRecipientId: appointment.careRecipientId,
        careRecipientName: appointment.careRecipient.preferredName || appointment.careRecipient.fullName,
        familyId: appointment.careRecipient.familyId,
        deletedById: userId,
        deletedByName: admin?.fullName || 'Admin',
        originalDateTime: appointment.startTime.toISOString(),
        affectedUserIds: familyMembers.map((m) => m.userId).filter((uid) => uid !== userId),
      },
      { aggregateType: 'Appointment', aggregateId: id },
      { familyId: appointment.careRecipient.familyId, careRecipientId: appointment.careRecipientId, causedBy: userId },
    );

    await this.prisma.appointment.delete({
      where: { id },
    });

    // Invalidate cache
    await this.invalidateAppointmentCache(appointment.careRecipientId, id);

    return { success: true };
  }

  /**
   * Invalidate appointment caches
   */
  private async invalidateAppointmentCache(careRecipientId: string, appointmentId?: string): Promise<void> {
    const keys = [CACHE_KEYS.APPOINTMENTS_UPCOMING(careRecipientId)];
    if (appointmentId) {
      keys.push(CACHE_KEYS.APPOINTMENT(appointmentId));
    }
    await this.cacheService.del(keys);
    // Also invalidate day cache patterns
    await this.cacheService.delPattern(`recipient:appointments:${careRecipientId}:*`);
  }

  async assignTransport(id: string, userId: string, dto: AssignTransportDto) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const { membership } = await this.verifyAccess(appointment.careRecipientId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot assign transport');
    }

    // Check if assignment already exists
    const existing = await this.prisma.transportAssignment.findUnique({
      where: { appointmentId: id },
    });

    if (existing) {
      return this.prisma.transportAssignment.update({
        where: { appointmentId: id },
        data: {
          assignedToId: dto.assigneeId,
          notes: dto.notes,
          confirmed: false,
        },
      });
    }

    return this.prisma.transportAssignment.create({
      data: {
        appointmentId: id,
        assignedToId: dto.assigneeId,
        notes: dto.notes,
      },
    });
  }

  async confirmTransport(id: string, userId: string) {
    const assignment = await this.prisma.transportAssignment.findUnique({
      where: { appointmentId: id },
      include: { appointment: true },
    });

    if (!assignment) {
      throw new NotFoundException('Transport assignment not found');
    }

    if (assignment.assignedToId !== userId) {
      throw new ForbiddenException('You are not assigned to this transport');
    }

    return this.prisma.transportAssignment.update({
      where: { appointmentId: id },
      data: { confirmed: true },
    });
  }
}

