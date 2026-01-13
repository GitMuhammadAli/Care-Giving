// @ts-nocheck
// TypeORM-based service - kept for reference/migration
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CareRecipient } from '../entity/care-recipient.entity';
import { Doctor } from '../entity/doctor.entity';
import { EmergencyContact } from '../entity/emergency-contact.entity';
import { CareRecipientRepository } from '../repository/care-recipient.repository';
import { FamilyMemberRepository } from '../../family/repository/family-member.repository';
import { ContextHelper } from '../../system/helper/context.helper';

import { CreateCareRecipientDto } from '../dto/create-care-recipient.dto';
import { CreateDoctorDto } from '../dto/create-doctor.dto';
import { CreateEmergencyContactDto } from '../dto/create-emergency-contact.dto';

@Injectable()
export class CareRecipientService {
  constructor(
    private readonly careRecipientRepository: CareRecipientRepository,
    private readonly familyMemberRepository: FamilyMemberRepository,
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
    @InjectRepository(EmergencyContact)
    private readonly emergencyContactRepository: Repository<EmergencyContact>,
  ) {}

  async create(familyId: string, dto: CreateCareRecipientDto): Promise<CareRecipient> {
    await this.ensureEditAccess(familyId);

    return this.careRecipientRepository.createRecipient({
      ...dto,
      familyId,
    });
  }

  async findByFamily(familyId: string): Promise<CareRecipient[]> {
    await this.ensureMemberAccess(familyId);
    return this.careRecipientRepository.findByFamily(familyId);
  }

  async findById(id: string): Promise<CareRecipient> {
    const recipient = await this.careRecipientRepository.findById(id);
    if (!recipient) {
      throw new NotFoundException('Care recipient not found');
    }

    await this.ensureMemberAccess(recipient.familyId);
    return recipient;
  }

  async update(id: string, dto: Partial<CreateCareRecipientDto>): Promise<CareRecipient> {
    const recipient = await this.findById(id);
    await this.ensureEditAccess(recipient.familyId);

    return this.careRecipientRepository.updateRecipient(id, dto);
  }

  async delete(id: string): Promise<void> {
    const recipient = await this.findById(id);
    await this.ensureEditAccess(recipient.familyId);

    await this.careRecipientRepository.softDelete(id);
  }

  // Doctors
  async addDoctor(recipientId: string, dto: CreateDoctorDto): Promise<Doctor> {
    const recipient = await this.findById(recipientId);
    await this.ensureEditAccess(recipient.familyId);

    // If setting as primary, unset other primaries
    if (dto.isPrimary) {
      await this.doctorRepository.update(
        { careRecipientId: recipientId, isPrimary: true },
        { isPrimary: false },
      );
    }

    const doctor = this.doctorRepository.create({
      ...dto,
      careRecipientId: recipientId,
    });

    return this.doctorRepository.save(doctor);
  }

  async updateDoctor(id: string, dto: Partial<CreateDoctorDto>): Promise<Doctor> {
    const doctor = await this.doctorRepository.findOne({
      where: { id },
      relations: ['careRecipient'],
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    await this.ensureEditAccess(doctor.careRecipient.familyId);

    if (dto.isPrimary) {
      await this.doctorRepository.update(
        { careRecipientId: doctor.careRecipientId, isPrimary: true },
        { isPrimary: false },
      );
    }

    Object.assign(doctor, dto);
    return this.doctorRepository.save(doctor);
  }

  async removeDoctor(id: string): Promise<void> {
    const doctor = await this.doctorRepository.findOne({
      where: { id },
      relations: ['careRecipient'],
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    await this.ensureEditAccess(doctor.careRecipient.familyId);
    await this.doctorRepository.softDelete(id);
  }

  // Emergency Contacts
  async addEmergencyContact(
    recipientId: string,
    dto: CreateEmergencyContactDto,
  ): Promise<EmergencyContact> {
    const recipient = await this.findById(recipientId);
    await this.ensureEditAccess(recipient.familyId);

    if (dto.isPrimary) {
      await this.emergencyContactRepository.update(
        { careRecipientId: recipientId, isPrimary: true },
        { isPrimary: false },
      );
    }

    const contact = this.emergencyContactRepository.create({
      ...dto,
      careRecipientId: recipientId,
    });

    return this.emergencyContactRepository.save(contact);
  }

  async updateEmergencyContact(
    id: string,
    dto: Partial<CreateEmergencyContactDto>,
  ): Promise<EmergencyContact> {
    const contact = await this.emergencyContactRepository.findOne({
      where: { id },
      relations: ['careRecipient'],
    });

    if (!contact) {
      throw new NotFoundException('Emergency contact not found');
    }

    await this.ensureEditAccess(contact.careRecipient.familyId);

    if (dto.isPrimary) {
      await this.emergencyContactRepository.update(
        { careRecipientId: contact.careRecipientId, isPrimary: true },
        { isPrimary: false },
      );
    }

    Object.assign(contact, dto);
    return this.emergencyContactRepository.save(contact);
  }

  async removeEmergencyContact(id: string): Promise<void> {
    const contact = await this.emergencyContactRepository.findOne({
      where: { id },
      relations: ['careRecipient'],
    });

    if (!contact) {
      throw new NotFoundException('Emergency contact not found');
    }

    await this.ensureEditAccess(contact.careRecipient.familyId);
    await this.emergencyContactRepository.softDelete(id);
  }

  // Access helpers
  private async ensureMemberAccess(familyId: string): Promise<void> {
    const userId = ContextHelper.getUserId();
    const member = await this.familyMemberRepository.findByFamilyAndUser(familyId, userId!);

    if (!member) {
      throw new NotFoundException('Care recipient not found');
    }
  }

  private async ensureEditAccess(familyId: string): Promise<void> {
    const userId = ContextHelper.getUserId();
    const member = await this.familyMemberRepository.findByFamilyAndUser(familyId, userId!);

    if (!member) {
      throw new NotFoundException('Care recipient not found');
    }

    if (!member.canEditCareData()) {
      throw new ForbiddenException('You do not have permission to edit care data');
    }
  }
}

