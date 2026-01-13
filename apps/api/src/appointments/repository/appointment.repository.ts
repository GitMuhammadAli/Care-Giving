import { Injectable } from '@nestjs/common';
import { DataSource, Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Appointment, AppointmentStatus } from '../entity/appointment.entity';

@Injectable()
export class AppointmentRepository extends Repository<Appointment> {
  constructor(private dataSource: DataSource) {
    super(Appointment, dataSource.createEntityManager());
  }

  async findByCareRecipient(careRecipientId: string): Promise<Appointment[]> {
    return this.find({
      where: { careRecipientId },
      relations: ['transportAssignedTo', 'createdBy'],
      order: { dateTime: 'ASC' },
    });
  }

  async findByDateRange(
    careRecipientId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Appointment[]> {
    return this.find({
      where: {
        careRecipientId,
        dateTime: Between(startDate, endDate),
      },
      relations: ['transportAssignedTo', 'createdBy'],
      order: { dateTime: 'ASC' },
    });
  }

  async findUpcoming(careRecipientId: string, limit = 5): Promise<Appointment[]> {
    return this.find({
      where: {
        careRecipientId,
        dateTime: MoreThanOrEqual(new Date()),
        status: AppointmentStatus.SCHEDULED,
      },
      relations: ['transportAssignedTo'],
      order: { dateTime: 'ASC' },
      take: limit,
    });
  }

  async findByTransportAssignee(userId: string): Promise<Appointment[]> {
    return this.find({
      where: {
        transportAssignedToId: userId,
        dateTime: MoreThanOrEqual(new Date()),
      },
      relations: ['careRecipient'],
      order: { dateTime: 'ASC' },
    });
  }
}

