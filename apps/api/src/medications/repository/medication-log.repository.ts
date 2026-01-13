import { Injectable } from '@nestjs/common';
import { DataSource, Repository, Between } from 'typeorm';
import { MedicationLog, MedicationLogStatus } from '../entity/medication-log.entity';

@Injectable()
export class MedicationLogRepository extends Repository<MedicationLog> {
  constructor(private dataSource: DataSource) {
    super(MedicationLog, dataSource.createEntityManager());
  }

  async findByMedication(medicationId: string, limit = 30): Promise<MedicationLog[]> {
    return this.find({
      where: { medicationId },
      relations: ['loggedBy'],
      order: { scheduledTime: 'DESC' },
      take: limit,
    });
  }

  async findByDateRange(
    medicationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<MedicationLog[]> {
    return this.find({
      where: {
        medicationId,
        scheduledTime: Between(startDate, endDate),
      },
      relations: ['loggedBy'],
      order: { scheduledTime: 'ASC' },
    });
  }

  async findTodayByCaregiver(caregiverId: string): Promise<MedicationLog[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.find({
      where: {
        loggedById: caregiverId,
        createdAt: Between(today, tomorrow),
      },
      relations: ['medication'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAdherenceStats(
    medicationId: string,
    days = 30,
  ): Promise<{ given: number; skipped: number; missed: number }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.find({
      where: {
        medicationId,
        scheduledTime: Between(startDate, new Date()),
      },
    });

    return {
      given: logs.filter((l) => l.status === MedicationLogStatus.GIVEN).length,
      skipped: logs.filter((l) => l.status === MedicationLogStatus.SKIPPED).length,
      missed: logs.filter((l) => l.status === MedicationLogStatus.MISSED).length,
    };
  }
}

