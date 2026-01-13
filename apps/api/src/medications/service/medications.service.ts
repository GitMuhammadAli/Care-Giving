// @ts-nocheck
// TypeORM-based service - kept for reference/migration
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Medication } from '../entity/medication.entity';
import { MedicationLog, MedicationLogStatus } from '../entity/medication-log.entity';
import { MedicationRepository } from '../repository/medication.repository';
import { MedicationLogRepository } from '../repository/medication-log.repository';
import { CreateMedicationDto } from '../dto/create-medication.dto';
import { UpdateMedicationDto } from '../dto/update-medication.dto';
import { LogMedicationDto } from '../dto/log-medication.dto';
import { ContextHelper } from '../../system/helper/context.helper';

@Injectable()
export class MedicationsService {
  constructor(
    @InjectRepository(MedicationRepository)
    private readonly medicationRepository: MedicationRepository,
    @InjectRepository(MedicationLogRepository)
    private readonly logRepository: MedicationLogRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(careRecipientId: string, dto: CreateMedicationDto): Promise<Medication> {
    const user = ContextHelper.getUser();
    
    const medication = this.medicationRepository.create({
      ...dto,
      careRecipientId,
      createdById: user.id,
    });

    const saved = await this.medicationRepository.save(medication);

    this.eventEmitter.emit('medication.created', saved);

    return saved;
  }

  async findAll(careRecipientId: string, activeOnly = true): Promise<Medication[]> {
    return this.medicationRepository.findByCareRecipient(careRecipientId, activeOnly);
  }

  async findOne(id: string): Promise<Medication> {
    const medication = await this.medicationRepository.findOne({
      where: { id },
      relations: ['createdBy', 'careRecipient'],
    });

    if (!medication) {
      throw new NotFoundException('Medication not found');
    }

    return medication;
  }

  async findWithLogs(id: string): Promise<Medication> {
    const medication = await this.medicationRepository.findWithLogs(id);

    if (!medication) {
      throw new NotFoundException('Medication not found');
    }

    return medication;
  }

  async update(id: string, dto: UpdateMedicationDto): Promise<Medication> {
    const medication = await this.findOne(id);
    
    Object.assign(medication, dto);
    const updated = await this.medicationRepository.save(medication);

    this.eventEmitter.emit('medication.updated', updated);

    return updated;
  }

  async deactivate(id: string): Promise<Medication> {
    const medication = await this.findOne(id);
    medication.isActive = false;
    return this.medicationRepository.save(medication);
  }

  async remove(id: string): Promise<void> {
    const medication = await this.findOne(id);
    await this.medicationRepository.softRemove(medication);

    this.eventEmitter.emit('medication.deleted', { id });
  }

  // Medication Logging
  async logMedication(medicationId: string, dto: LogMedicationDto): Promise<MedicationLog> {
    const user = ContextHelper.getUser();
    const medication = await this.findOne(medicationId);

    const log = this.logRepository.create({
      ...dto,
      medicationId,
      loggedById: user.id,
      givenTime: dto.status === MedicationLogStatus.GIVEN ? new Date() : null,
    });

    const saved = await this.logRepository.save(log);

    // Update supply count if given
    if (dto.status === MedicationLogStatus.GIVEN && medication.currentSupply !== null) {
      medication.currentSupply = Math.max(0, medication.currentSupply - 1);
      await this.medicationRepository.save(medication);

      // Check for low supply
      if (medication.refillAlertAt && medication.currentSupply <= medication.refillAlertAt) {
        this.eventEmitter.emit('medication.lowSupply', medication);
      }
    }

    this.eventEmitter.emit('medication.logged', {
      log: saved,
      medication,
      loggedBy: user,
    });

    return saved;
  }

  async getLogs(medicationId: string, limit = 30): Promise<MedicationLog[]> {
    return this.logRepository.findByMedication(medicationId, limit);
  }

  async getLogsByDateRange(
    medicationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<MedicationLog[]> {
    return this.logRepository.findByDateRange(medicationId, startDate, endDate);
  }

  async getAdherenceStats(medicationId: string, days = 30) {
    return this.logRepository.getAdherenceStats(medicationId, days);
  }

  async getLowSupplyMedications(careRecipientId: string): Promise<Medication[]> {
    return this.medicationRepository.findLowSupply(careRecipientId);
  }

  // Get today's schedule
  async getTodaySchedule(careRecipientId: string): Promise<any[]> {
    const medications = await this.medicationRepository.findByCareRecipient(careRecipientId, true);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's logs
    const schedule: any[] = [];

    for (const medication of medications) {
      for (const time of medication.scheduledTimes) {
        const [hours, minutes] = time.split(':').map(Number);
        const scheduledTime = new Date(today);
        scheduledTime.setHours(hours, minutes, 0, 0);

        // Find if logged
        const log = await this.logRepository.findOne({
          where: {
            medicationId: medication.id,
            scheduledTime,
          },
          relations: ['loggedBy'],
        });

        schedule.push({
          medication: {
            id: medication.id,
            name: medication.name,
            dosage: medication.dosage,
            form: medication.form,
            instructions: medication.instructions,
          },
          scheduledTime,
          time,
          status: log?.status || 'PENDING',
          givenTime: log?.givenTime,
          givenBy: log?.loggedBy,
          skipReason: log?.skipReason,
        });
      }
    }

    // Sort by time
    schedule.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());

    return schedule;
  }
}

