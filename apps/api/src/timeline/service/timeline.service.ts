// @ts-nocheck
// TypeORM-based service - kept for reference/migration
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TimelineEntry, TimelineEntryType } from '../entity/timeline-entry.entity';
import { TimelineEntryRepository } from '../repository/timeline-entry.repository';
import { CreateTimelineEntryDto } from '../dto/create-timeline-entry.dto';
import { ContextHelper } from '../../system/helper/context.helper';

@Injectable()
export class TimelineService {
  constructor(
    @InjectRepository(TimelineEntryRepository)
    private readonly entryRepository: TimelineEntryRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(careRecipientId: string, dto: CreateTimelineEntryDto): Promise<TimelineEntry> {
    const user = ContextHelper.getUser();

    const entry = this.entryRepository.create({
      ...dto,
      careRecipientId,
      createdById: user.id,
    });

    const saved = await this.entryRepository.save(entry);

    this.eventEmitter.emit('timeline.entry.created', {
      entry: saved,
      createdBy: user,
    });

    return saved;
  }

  async findAll(
    careRecipientId: string,
    limit = 50,
    offset = 0,
  ): Promise<TimelineEntry[]> {
    return this.entryRepository.findByCareRecipient(careRecipientId, limit, offset);
  }

  async findByType(
    careRecipientId: string,
    types: TimelineEntryType[],
    limit = 50,
  ): Promise<TimelineEntry[]> {
    return this.entryRepository.findByType(careRecipientId, types, limit);
  }

  async findByDateRange(
    careRecipientId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TimelineEntry[]> {
    return this.entryRepository.findByDateRange(careRecipientId, startDate, endDate);
  }

  async findOne(id: string): Promise<TimelineEntry> {
    const entry = await this.entryRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!entry) {
      throw new NotFoundException('Timeline entry not found');
    }

    return entry;
  }

  async findRecent(careRecipientId: string, limit = 10): Promise<TimelineEntry[]> {
    return this.entryRepository.findRecent(careRecipientId, limit);
  }

  async remove(id: string): Promise<void> {
    const entry = await this.findOne(id);
    await this.entryRepository.softRemove(entry);

    this.eventEmitter.emit('timeline.entry.deleted', { id });
  }

  // Vitals history
  async getVitalsHistory(careRecipientId: string, days = 30): Promise<TimelineEntry[]> {
    return this.entryRepository.findVitalsHistory(careRecipientId, days);
  }

  // Get vitals summary
  async getVitalsSummary(careRecipientId: string): Promise<any> {
    const vitals = await this.getVitalsHistory(careRecipientId, 7);
    
    if (vitals.length === 0) {
      return null;
    }

    const latest = vitals[vitals.length - 1];

    return {
      latest: latest.vitals,
      latestDate: latest.createdAt,
      count: vitals.length,
    };
  }

  // Create system entries (medication logged, appointment, etc.)
  async createSystemEntry(
    careRecipientId: string,
    type: TimelineEntryType,
    title: string,
    description: string,
    metadata?: any,
  ): Promise<TimelineEntry> {
    const entry = this.entryRepository.create({
      type,
      title,
      description,
      metadata,
      careRecipientId,
      createdById: ContextHelper.getUser().id,
    });

    return this.entryRepository.save(entry);
  }
}

