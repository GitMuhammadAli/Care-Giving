import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AssignTransportDto } from './dto/assign-transport.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { addMonths, startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
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

    return this.prisma.appointment.create({
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
  }

  async findForDay(careRecipientId: string, userId: string, date: Date) {
    await this.verifyAccess(careRecipientId, userId);

    return this.prisma.appointment.findMany({
      where: {
        careRecipientId,
        startTime: { gte: startOfDay(date), lte: endOfDay(date) },
      },
      include: {
        doctor: true,
        transportAssignment: true,
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async findOne(id: string, userId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        careRecipient: true,
        doctor: true,
        transportAssignment: true,
      },
    });

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

    return this.prisma.appointment.update({
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

    return this.prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
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

