import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../system/module/cache';
import { EventPublisherService } from '../events/publishers/event-publisher.service';
import { ROUTING_KEYS } from '../events/events.constants';
import { CreateAppointmentDto, RecurrencePattern } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AssignTransportDto } from './dto/assign-transport.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { addMonths, startOfDay, endOfDay, format, addMinutes, differenceInMinutes } from 'date-fns';
import { RRule, RRuleSet, Frequency } from 'rrule';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

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

    // Get care recipient for family info
    const careRecipient = await this.prisma.careRecipient.findUnique({
      where: { id: careRecipientId },
      select: { familyId: true, fullName: true, preferredName: true },
    });

    // Get creator info
    const creator = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });

    // Publish to RabbitMQ for multi-instance sync
    if (careRecipient) {
      try {
        await this.eventPublisher.publish(
          ROUTING_KEYS.APPOINTMENT_CREATED,
          {
            appointmentId: appointment.id,
            appointmentTitle: appointment.title,
            appointmentType: appointment.type,
            careRecipientId,
            careRecipientName: careRecipient.preferredName || careRecipient.fullName,
            familyId: careRecipient.familyId,
            startTime: appointment.startTime.toISOString(),
            endTime: appointment.endTime.toISOString(),
            location: appointment.location,
            createdById: userId,
            createdByName: creator?.fullName || 'Unknown',
          },
          { aggregateType: 'Appointment', aggregateId: appointment.id },
          { familyId: careRecipient.familyId, careRecipientId, causedBy: userId },
        );
      } catch (error) {
        // Don't fail the operation if event publishing fails
        console.warn('Failed to publish appointment.created event:', error);
      }
    }

    // Emit internal event for WebSocket broadcast (local instance)
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
          assignedToId: dto.assignedToId,
          notes: dto.notes,
          confirmed: false,
        },
      });
    }

    return this.prisma.transportAssignment.create({
      data: {
        appointmentId: id,
        assignedToId: dto.assignedToId,
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

  // ==================== RECURRING APPOINTMENTS ====================

  /**
   * Convert a simple recurrence pattern to an RRULE string
   */
  private patternToRRule(pattern: RecurrencePattern, startDate: Date, endDate?: Date): string | null {
    if (pattern === RecurrencePattern.NONE) return null;

    const options: any = {
      dtstart: startDate,
      until: endDate,
    };

    switch (pattern) {
      case RecurrencePattern.DAILY:
        options.freq = Frequency.DAILY;
        break;
      case RecurrencePattern.WEEKLY:
        options.freq = Frequency.WEEKLY;
        break;
      case RecurrencePattern.BIWEEKLY:
        options.freq = Frequency.WEEKLY;
        options.interval = 2;
        break;
      case RecurrencePattern.MONTHLY:
        options.freq = Frequency.MONTHLY;
        break;
      default:
        return null;
    }

    const rule = new RRule(options);
    return rule.toString();
  }

  /**
   * Create a recurring appointment series
   */
  async createRecurringSeries(
    careRecipientId: string,
    userId: string,
    dto: CreateAppointmentDto,
    maxOccurrences: number = 52, // Default 1 year of weekly appointments
  ) {
    const { membership } = await this.verifyAccess(careRecipientId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot create appointments');
    }

    // Calculate start and end times
    const startTime = new Date(dto.startTime || dto.dateTime!);
    const duration = dto.duration || 60;
    const endTime = dto.endTime ? new Date(dto.endTime) : addMinutes(startTime, duration);
    const durationMinutes = differenceInMinutes(endTime, startTime);

    // Generate RRULE from pattern if not provided directly
    let rruleString = dto.recurrenceRule;
    if (!rruleString && dto.recurrence && dto.recurrence !== RecurrencePattern.NONE) {
      const recurrenceEnd = dto.recurrenceEndDate ? new Date(dto.recurrenceEndDate) : addMonths(startTime, 12);
      rruleString = this.patternToRRule(dto.recurrence, startTime, recurrenceEnd);
    }

    if (!rruleString) {
      throw new ForbiddenException('Recurrence rule is required for recurring appointments');
    }

    // Parse and generate occurrences
    const rule = RRule.fromString(rruleString);
    const occurrences = rule.all((date, i) => i < maxOccurrences);

    this.logger.log(`Creating recurring series with ${occurrences.length} occurrences`);

    // Create a unique series ID to link all appointments
    const seriesId = `series_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create all appointments in a transaction
    const appointments = await this.prisma.$transaction(
      occurrences.map((occurDate, index) => {
        const occurStart = new Date(occurDate);
        const occurEnd = addMinutes(occurStart, durationMinutes);

        return this.prisma.appointment.create({
          data: {
            careRecipientId,
            doctorId: dto.doctorId,
            title: dto.title,
            type: dto.type,
            startTime: occurStart,
            endTime: occurEnd,
            location: dto.location,
            address: dto.address,
            notes: dto.notes,
            isRecurring: true,
            recurrenceRule: rruleString,
            recurringSeriesId: seriesId,
            recurringIndex: index,
            reminderMinutes: dto.reminderMinutes || [60, 1440],
          },
          include: {
            doctor: true,
          },
        });
      }),
    );

    // Invalidate cache
    await this.invalidateAppointmentCache(careRecipientId);

    // Emit event for first appointment
    if (appointments.length > 0) {
      this.eventEmitter.emit('appointment.created', appointments[0]);
    }

    return {
      seriesId,
      totalCreated: appointments.length,
      appointments: appointments.slice(0, 5), // Return first 5 for preview
      nextOccurrences: appointments.length > 5 ? appointments.slice(5, 10).map(a => a.startTime) : [],
    };
  }

  /**
   * Get expanded occurrences from a recurring appointment within a date range
   */
  async getRecurringOccurrences(
    appointmentId: string,
    userId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { doctor: true },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    await this.verifyAccess(appointment.careRecipientId, userId);

    if (!appointment.isRecurring || !appointment.recurrenceRule) {
      return [appointment];
    }

    // Parse the RRULE
    const rule = RRule.fromString(appointment.recurrenceRule);
    
    // Get occurrences within the date range
    const occurrences = rule.between(startDate, endDate);
    const durationMinutes = differenceInMinutes(appointment.endTime, appointment.startTime);

    // Return virtual appointment instances
    return occurrences.map((occurDate, index) => ({
      ...appointment,
      id: `${appointment.id}_${index}`,
      virtualOccurrence: true,
      originalAppointmentId: appointment.id,
      startTime: occurDate,
      endTime: addMinutes(occurDate, durationMinutes),
    }));
  }

  /**
   * Update all future appointments in a recurring series
   */
  async updateRecurringSeries(
    seriesId: string,
    userId: string,
    dto: UpdateAppointmentDto,
    fromDate?: Date,
  ) {
    // Find all appointments in the series
    const appointments = await this.prisma.appointment.findMany({
      where: {
        recurringSeriesId: seriesId,
        startTime: fromDate ? { gte: fromDate } : undefined,
      },
      orderBy: { startTime: 'asc' },
    });

    if (appointments.length === 0) {
      throw new NotFoundException('No appointments found in series');
    }

    // Verify access using the first appointment
    const { membership } = await this.verifyAccess(appointments[0].careRecipientId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot update appointments');
    }

    // Update all appointments in the series
    const updateData: any = {};
    if (dto.doctorId !== undefined) updateData.doctorId = dto.doctorId;
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.reminderMinutes !== undefined) updateData.reminderMinutes = dto.reminderMinutes;

    const result = await this.prisma.appointment.updateMany({
      where: {
        recurringSeriesId: seriesId,
        startTime: fromDate ? { gte: fromDate } : undefined,
      },
      data: updateData,
    });

    // Invalidate cache
    await this.invalidateAppointmentCache(appointments[0].careRecipientId);

    return {
      seriesId,
      updatedCount: result.count,
    };
  }

  /**
   * Cancel all future appointments in a recurring series
   */
  async cancelRecurringSeries(
    seriesId: string,
    userId: string,
    fromDate?: Date,
  ) {
    // Find all appointments in the series
    const appointments = await this.prisma.appointment.findMany({
      where: {
        recurringSeriesId: seriesId,
        startTime: fromDate ? { gte: fromDate } : undefined,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
    });

    if (appointments.length === 0) {
      throw new NotFoundException('No active appointments found in series');
    }

    // Verify access
    const { membership } = await this.verifyAccess(appointments[0].careRecipientId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot cancel appointments');
    }

    const result = await this.prisma.appointment.updateMany({
      where: {
        recurringSeriesId: seriesId,
        startTime: fromDate ? { gte: fromDate } : undefined,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
      data: { status: 'CANCELLED' },
    });

    // Invalidate cache
    await this.invalidateAppointmentCache(appointments[0].careRecipientId);

    return {
      seriesId,
      cancelledCount: result.count,
    };
  }

  /**
   * Delete a specific occurrence from a recurring series (creates an exception)
   */
  async deleteRecurringOccurrence(
    appointmentId: string,
    userId: string,
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const { membership } = await this.verifyAccess(appointment.careRecipientId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot delete appointments');
    }

    // If it's part of a series, just mark this occurrence as cancelled
    if (appointment.recurringSeriesId) {
      const updated = await this.prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'CANCELLED' },
      });

      await this.invalidateAppointmentCache(appointment.careRecipientId);

      return {
        message: 'Occurrence removed from series',
        appointment: updated,
      };
    }

    // Otherwise, delete the appointment
    await this.prisma.appointment.delete({
      where: { id: appointmentId },
    });

    await this.invalidateAppointmentCache(appointment.careRecipientId);

    return { success: true };
  }

  /**
   * Get all series for a care recipient
   */
  async getRecurringSeries(careRecipientId: string, userId: string) {
    await this.verifyAccess(careRecipientId, userId);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        careRecipientId,
        isRecurring: true,
        recurringSeriesId: { not: null },
      },
      distinct: ['recurringSeriesId'],
      orderBy: { startTime: 'asc' },
      include: {
        doctor: true,
      },
    });

    // Get all series IDs
    const seriesIds = [...new Set(
      appointments
        .filter(a => a.recurringSeriesId)
        .map(a => a.recurringSeriesId as string)
    )];

    if (seriesIds.length === 0) {
      return [];
    }

    // Batch query: Get counts for all series at once (fixes N+1)
    const [totalCounts, upcomingCounts] = await Promise.all([
      this.prisma.appointment.groupBy({
        by: ['recurringSeriesId'],
        where: { recurringSeriesId: { in: seriesIds } },
        _count: true,
      }),
      this.prisma.appointment.groupBy({
        by: ['recurringSeriesId'],
        where: {
          recurringSeriesId: { in: seriesIds },
          startTime: { gte: new Date() },
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
        },
        _count: true,
      }),
    ]);

    // Create lookup maps
    const totalMap = new Map(totalCounts.map(c => [c.recurringSeriesId, c._count]));
    const upcomingMap = new Map(upcomingCounts.map(c => [c.recurringSeriesId, c._count]));

    // Build result
    const seriesMap = new Map<string, any>();
    for (const apt of appointments) {
      if (apt.recurringSeriesId && !seriesMap.has(apt.recurringSeriesId)) {
        seriesMap.set(apt.recurringSeriesId, {
          seriesId: apt.recurringSeriesId,
          title: apt.title,
          type: apt.type,
          doctor: apt.doctor,
          recurrenceRule: apt.recurrenceRule,
          totalAppointments: totalMap.get(apt.recurringSeriesId) || 0,
          upcomingCount: upcomingMap.get(apt.recurringSeriesId) || 0,
          firstOccurrence: apt.startTime,
        });
      }
    }

    return Array.from(seriesMap.values());
  }
}

