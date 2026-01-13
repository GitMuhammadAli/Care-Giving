import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CaregiverShift, ShiftStatus } from '../entity/caregiver-shift.entity';
import { CaregiverShiftRepository } from '../repository/caregiver-shift.repository';
import { CreateShiftDto } from '../dto/create-shift.dto';
import { CheckOutDto } from '../dto/check-out.dto';
import { ContextHelper } from '../../system/helper/context.helper';

@Injectable()
export class CaregiverShiftsService {
  constructor(
    @InjectRepository(CaregiverShiftRepository)
    private readonly shiftRepository: CaregiverShiftRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(careRecipientId: string, dto: CreateShiftDto): Promise<CaregiverShift> {
    const user = ContextHelper.getUser();

    const shift = this.shiftRepository.create({
      ...dto,
      careRecipientId,
      createdById: user.id,
    });

    const saved = await this.shiftRepository.save(shift);

    this.eventEmitter.emit('shift.created', saved);

    return saved;
  }

  async findAll(careRecipientId: string): Promise<CaregiverShift[]> {
    return this.shiftRepository.findByCareRecipient(careRecipientId);
  }

  async findByDateRange(
    careRecipientId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CaregiverShift[]> {
    return this.shiftRepository.findByDateRange(careRecipientId, startDate, endDate);
  }

  async findCurrentShift(careRecipientId: string): Promise<CaregiverShift | null> {
    return this.shiftRepository.findCurrentShift(careRecipientId);
  }

  async findUpcoming(careRecipientId: string, limit = 5): Promise<CaregiverShift[]> {
    return this.shiftRepository.findUpcoming(careRecipientId, limit);
  }

  async findOne(id: string): Promise<CaregiverShift> {
    const shift = await this.shiftRepository.findOne({
      where: { id },
      relations: ['caregiver', 'careRecipient', 'createdBy'],
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    return shift;
  }

  async checkIn(id: string, notes?: string, location?: string): Promise<CaregiverShift> {
    const user = ContextHelper.getUser();
    const shift = await this.findOne(id);

    if (shift.caregiverId !== user.id) {
      throw new BadRequestException('You can only check in to your own shifts');
    }

    if (shift.status !== ShiftStatus.SCHEDULED) {
      throw new BadRequestException('This shift cannot be checked in');
    }

    shift.status = ShiftStatus.IN_PROGRESS;
    shift.actualStartTime = new Date();
    shift.checkInNotes = notes;
    shift.checkInLocation = location;

    const updated = await this.shiftRepository.save(shift);

    this.eventEmitter.emit('shift.checkedIn', {
      shift: updated,
      caregiver: user,
    });

    return updated;
  }

  async checkOut(id: string, dto: CheckOutDto): Promise<CaregiverShift> {
    const user = ContextHelper.getUser();
    const shift = await this.findOne(id);

    if (shift.caregiverId !== user.id) {
      throw new BadRequestException('You can only check out of your own shifts');
    }

    if (shift.status !== ShiftStatus.IN_PROGRESS) {
      throw new BadRequestException('You must be checked in to check out');
    }

    shift.status = ShiftStatus.COMPLETED;
    shift.actualEndTime = new Date();
    shift.checkOutNotes = dto.notes;
    shift.checkOutLocation = dto.location;
    shift.handoffNotes = dto.handoffNotes;

    const updated = await this.shiftRepository.save(shift);

    this.eventEmitter.emit('shift.checkedOut', {
      shift: updated,
      caregiver: user,
    });

    return updated;
  }

  async cancel(id: string): Promise<CaregiverShift> {
    const shift = await this.findOne(id);

    if (shift.status !== ShiftStatus.SCHEDULED) {
      throw new BadRequestException('Only scheduled shifts can be cancelled');
    }

    shift.status = ShiftStatus.CANCELLED;

    const updated = await this.shiftRepository.save(shift);

    this.eventEmitter.emit('shift.cancelled', { shift: updated });

    return updated;
  }

  async getMyCaregiverShifts(upcomingOnly = false): Promise<CaregiverShift[]> {
    const user = ContextHelper.getUser();
    return this.shiftRepository.findByCaregiver(user.id, upcomingOnly);
  }

  async getOnDutyCaregiver(careRecipientId: string): Promise<{ caregiver: any; shift: CaregiverShift } | null> {
    const currentShift = await this.findCurrentShift(careRecipientId);
    
    if (!currentShift || currentShift.status !== ShiftStatus.IN_PROGRESS) {
      return null;
    }

    return {
      caregiver: currentShift.caregiver,
      shift: currentShift,
    };
  }
}

