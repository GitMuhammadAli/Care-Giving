// @ts-nocheck
// TypeORM-based service - kept for reference/migration
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Appointment, AppointmentStatus } from '../entity/appointment.entity';
import { AppointmentRepository } from '../repository/appointment.repository';
import { CreateAppointmentDto, RecurrencePattern } from '../dto/create-appointment.dto';
import { UpdateAppointmentDto } from '../dto/update-appointment.dto';
import { ContextHelper } from '../../system/helper/context.helper';
import { v4 as uuid } from 'uuid';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(AppointmentRepository)
    private readonly appointmentRepository: AppointmentRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(careRecipientId: string, dto: CreateAppointmentDto): Promise<Appointment> {
    const user = ContextHelper.getUser();
    
    const appointments: Appointment[] = [];
    const recurrenceRuleId = dto.recurrence !== RecurrencePattern.NONE ? uuid() : undefined;

    // Create the main appointment
    const mainAppointment = this.appointmentRepository.create({
      ...dto,
      careRecipientId,
      createdById: user.id,
      recurrenceRuleId,
    });
    
    appointments.push(mainAppointment);

    // Generate recurring appointments if needed
    if (dto.recurrence !== RecurrencePattern.NONE && dto.recurrenceEndDate) {
      const recurringAppointments = this.generateRecurringAppointments(
        mainAppointment,
        dto.recurrence,
        new Date(dto.recurrenceEndDate),
      );
      appointments.push(...recurringAppointments);
    }

    const saved = await this.appointmentRepository.save(appointments);

    this.eventEmitter.emit('appointment.created', saved[0]);

    return saved[0];
  }

  private generateRecurringAppointments(
    template: Appointment,
    recurrence: RecurrencePattern,
    endDate: Date,
  ): Appointment[] {
    const appointments: Appointment[] = [];
    let currentDate = new Date(template.dateTime);
    
    const getNextDate = (date: Date): Date => {
      const next = new Date(date);
      switch (recurrence) {
        case RecurrencePattern.DAILY:
          next.setDate(next.getDate() + 1);
          break;
        case RecurrencePattern.WEEKLY:
          next.setDate(next.getDate() + 7);
          break;
        case RecurrencePattern.BIWEEKLY:
          next.setDate(next.getDate() + 14);
          break;
        case RecurrencePattern.MONTHLY:
          next.setMonth(next.getMonth() + 1);
          break;
      }
      return next;
    };

    // Generate up to 52 occurrences max
    let count = 0;
    while (count < 52) {
      currentDate = getNextDate(currentDate);
      if (currentDate > endDate) break;

      const appointment = this.appointmentRepository.create({
        ...template,
        id: undefined,
        dateTime: currentDate,
      });
      appointments.push(appointment);
      count++;
    }

    return appointments;
  }

  async findAll(careRecipientId: string): Promise<Appointment[]> {
    return this.appointmentRepository.findByCareRecipient(careRecipientId);
  }

  async findByDateRange(
    careRecipientId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Appointment[]> {
    return this.appointmentRepository.findByDateRange(careRecipientId, startDate, endDate);
  }

  async findUpcoming(careRecipientId: string, limit = 5): Promise<Appointment[]> {
    return this.appointmentRepository.findUpcoming(careRecipientId, limit);
  }

  async findOne(id: string): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id },
      relations: ['transportAssignedTo', 'createdBy', 'careRecipient'],
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  async update(id: string, dto: UpdateAppointmentDto): Promise<Appointment> {
    const appointment = await this.findOne(id);
    
    Object.assign(appointment, dto);
    const updated = await this.appointmentRepository.save(appointment);

    this.eventEmitter.emit('appointment.updated', updated);

    return updated;
  }

  async updateStatus(id: string, status: AppointmentStatus): Promise<Appointment> {
    const appointment = await this.findOne(id);
    appointment.status = status;
    return this.appointmentRepository.save(appointment);
  }

  async assignTransport(id: string, userId: string): Promise<Appointment> {
    const appointment = await this.findOne(id);
    appointment.transportAssignedToId = userId;
    return this.appointmentRepository.save(appointment);
  }

  async remove(id: string): Promise<void> {
    const appointment = await this.findOne(id);
    await this.appointmentRepository.softRemove(appointment);

    this.eventEmitter.emit('appointment.deleted', { id });
  }

  async cancelRecurringSeries(recurrenceRuleId: string): Promise<void> {
    await this.appointmentRepository.update(
      { recurrenceRuleId, status: AppointmentStatus.SCHEDULED },
      { status: AppointmentStatus.CANCELLED },
    );
  }
}

