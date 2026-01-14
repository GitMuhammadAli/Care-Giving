import { Injectable } from '@nestjs/common';
import { DataSource, Repository, Between, MoreThanOrEqual, LessThanOrEqual, In } from 'typeorm';
import { CaregiverShift, ShiftStatus } from '../entity/caregiver-shift.entity';

@Injectable()
export class CaregiverShiftRepository extends Repository<CaregiverShift> {
  constructor(private dataSource: DataSource) {
    super(CaregiverShift, dataSource.createEntityManager());
  }

  async findByCareRecipient(careRecipientId: string): Promise<CaregiverShift[]> {
    return this.find({
      where: { careRecipientId },
      relations: ['caregiver', 'createdBy'],
      order: { startTime: 'ASC' },
    });
  }

  async findByDateRange(
    careRecipientId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CaregiverShift[]> {
    return this.find({
      where: {
        careRecipientId,
        startTime: Between(startDate, endDate),
      },
      relations: ['caregiver'],
      order: { startTime: 'ASC' },
    });
  }

  async findCurrentShift(careRecipientId: string): Promise<CaregiverShift | null> {
    const now = new Date();
    
    return this.findOne({
      where: {
        careRecipientId,
        status: In([ShiftStatus.SCHEDULED, ShiftStatus.IN_PROGRESS]),
        startTime: LessThanOrEqual(now),
        endTime: MoreThanOrEqual(now),
      },
      relations: ['caregiver'],
    });
  }

  async findByCaregiver(caregiverId: string, upcomingOnly = false): Promise<CaregiverShift[]> {
    const where: any = { caregiverId };
    if (upcomingOnly) {
      where.startTime = MoreThanOrEqual(new Date());
    }

    return this.find({
      where,
      relations: ['careRecipient'],
      order: { startTime: 'ASC' },
    });
  }

  async findUpcoming(careRecipientId: string, limit = 5): Promise<CaregiverShift[]> {
    return this.find({
      where: {
        careRecipientId,
        startTime: MoreThanOrEqual(new Date()),
        status: ShiftStatus.SCHEDULED,
      },
      relations: ['caregiver'],
      order: { startTime: 'ASC' },
      take: limit,
    });
  }

  async findOverlappingShifts(
    caregiverId: string,
    startTime: Date,
    endTime: Date,
    excludeId?: string,
  ): Promise<CaregiverShift[]> {
    const query = this.createQueryBuilder('shift')
      .where('shift.caregiverId = :caregiverId', { caregiverId })
      .andWhere('shift.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [ShiftStatus.CANCELLED, ShiftStatus.NO_SHOW],
      })
      .andWhere('shift.startTime < :endTime', { endTime })
      .andWhere('shift.endTime > :startTime', { startTime });

    if (excludeId) {
      query.andWhere('shift.id != :excludeId', { excludeId });
    }

    return query.getMany();
  }
}

