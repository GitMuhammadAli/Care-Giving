import { Injectable } from '@nestjs/common';
import { DataSource, Repository, Between, In } from 'typeorm';
import { TimelineEntry, TimelineEntryType } from '../entity/timeline-entry.entity';

@Injectable()
export class TimelineEntryRepository extends Repository<TimelineEntry> {
  constructor(private dataSource: DataSource) {
    super(TimelineEntry, dataSource.createEntityManager());
  }

  async findByCareRecipient(
    careRecipientId: string,
    limit = 50,
    offset = 0,
  ): Promise<TimelineEntry[]> {
    return this.find({
      where: { careRecipientId },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async findByType(
    careRecipientId: string,
    types: TimelineEntryType[],
    limit = 50,
  ): Promise<TimelineEntry[]> {
    return this.find({
      where: {
        careRecipientId,
        type: In(types),
      },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findByDateRange(
    careRecipientId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TimelineEntry[]> {
    return this.find({
      where: {
        careRecipientId,
        createdAt: Between(startDate, endDate),
      },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findVitalsHistory(
    careRecipientId: string,
    days = 30,
  ): Promise<TimelineEntry[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.find({
      where: {
        careRecipientId,
        type: TimelineEntryType.VITALS,
        createdAt: Between(startDate, new Date()),
      },
      order: { createdAt: 'ASC' },
    });
  }

  async findRecent(careRecipientId: string, limit = 10): Promise<TimelineEntry[]> {
    return this.find({
      where: { careRecipientId },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}

