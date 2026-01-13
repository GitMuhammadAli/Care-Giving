import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { addDays, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { RRule } from 'rrule';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

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
        startTime: new Date(dto.startTime || dto.dateTime || new Date()),
        endTime: new Date(dto.endTime || dto.dateTime || new Date()),
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

  async getUpcoming(careRecipientId: string, userId: string, days: number = 30) {
    await this.verifyAccess(careRecipientId, userId);

    const now = new Date();
    const futureDate = addDays(now, days);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        careRecipientId,
        startTime: { gte: now, lte: futureDate },
        status: { not: 'CANCELLED' },
      },
      include: {
        doctor: true,
        transportAssignment: true,
      },
      orderBy: { startTime: 'asc' },
    });

    return this.expandRecurring(appointments, now, futureDate);
  }

  async getForDay(careRecipientId: string, userId: string, date: Date) {
    await this.verifyAccess(careRecipientId, userId);

    return this.prisma.appointment.findMany({
      where: {
        careRecipientId,
        startTime: { gte: startOfDay(date), lte: endOfDay(date) },
        status: { not: 'CANCELLED' },
      },
      include: {
        doctor: true,
        transportAssignment: true,
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async getForMonth(careRecipientId: string, userId: string, year: number, month: number) {
    await this.verifyAccess(careRecipientId, userId);

    const date = new Date(year, month - 1, 1);

    return this.prisma.appointment.findMany({
      where: {
        careRecipientId,
        startTime: { gte: startOfMonth(date), lte: endOfMonth(date) },
        status: { not: 'CANCELLED' },
      },
      include: {
        doctor: true,
        transportAssignment: true,
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async update(appointmentId: string, userId: string, dto: UpdateAppointmentDto) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const { membership } = await this.verifyAccess(appointment.careRecipientId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot update appointments');
    }

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
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

  async cancel(appointmentId: string, userId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const { membership } = await this.verifyAccess(appointment.careRecipientId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot cancel appointments');
    }

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CANCELLED' },
    });
  }

  async assignTransport(appointmentId: string, userId: string, assigneeId: string, notes?: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const { membership } = await this.verifyAccess(appointment.careRecipientId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot assign transport');
    }

    return this.prisma.transportAssignment.upsert({
      where: { appointmentId },
      create: {
        appointmentId,
        assignedToId: assigneeId,
        notes,
      },
      update: {
        assignedToId: assigneeId,
        notes,
        confirmed: false,
      },
    });
  }

  async confirmTransport(appointmentId: string, userId: string) {
    const assignment = await this.prisma.transportAssignment.findUnique({
      where: { appointmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Transport assignment not found');
    }

    if (assignment.assignedToId !== userId) {
      throw new ForbiddenException('Only the assigned person can confirm transport');
    }

    return this.prisma.transportAssignment.update({
      where: { appointmentId },
      data: { confirmed: true },
    });
  }

  private expandRecurring(appointments: any[], start: Date, end: Date): any[] {
    const expanded: any[] = [];

    for (const apt of appointments) {
      if (apt.isRecurring && apt.recurrenceRule) {
        try {
          const rule = RRule.fromString(apt.recurrenceRule);
          const occurrences = rule.between(start, end);

          for (const occurrence of occurrences) {
            expanded.push({
              ...apt,
              startTime: occurrence,
              isRecurrenceInstance: true,
              originalAppointmentId: apt.id,
            });
          }
        } catch {
          // Invalid rule, just add the original
          expanded.push(apt);
        }
      } else {
        expanded.push(apt);
      }
    }

    return expanded.sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }
}

