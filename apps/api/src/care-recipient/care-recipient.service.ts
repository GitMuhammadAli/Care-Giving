import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../system/module/cache';
import { CreateCareRecipientDto } from './dto/create-care-recipient.dto';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { CreateEmergencyContactDto } from './dto/create-emergency-contact.dto';

@Injectable()
export class CareRecipientService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  private async verifyFamilyAccess(familyId: string, userId: string) {
    const membership = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this family');
    }

    return membership;
  }

  private async verifyCareRecipientAccess(careRecipientId: string, userId: string) {
    const careRecipient = await this.prisma.careRecipient.findUnique({
      where: { id: careRecipientId },
      include: { family: true },
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

  async create(familyId: string, userId: string, dto: CreateCareRecipientDto) {
    const membership = await this.verifyFamilyAccess(familyId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot add care recipients');
    }

    return this.prisma.careRecipient.create({
      data: {
        familyId,
        fullName: dto.fullName,
        preferredName: dto.preferredName,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        bloodType: dto.bloodType,
        allergies: dto.allergies || [],
        conditions: dto.conditions || [],
        notes: dto.notes,
        primaryHospital: dto.preferredHospital,
        hospitalAddress: dto.preferredHospitalAddress,
        insuranceProvider: dto.insuranceProvider,
        insurancePolicyNo: dto.insurancePolicyNumber,
      },
    });
  }

  async findAll(familyId: string, userId: string) {
    await this.verifyFamilyAccess(familyId, userId);

    const cacheKey = CACHE_KEYS.CARE_RECIPIENTS(familyId);

    return this.cacheService.getOrSet(
      cacheKey,
      () =>
        this.prisma.careRecipient.findMany({
          where: { familyId },
          include: {
            _count: {
              select: {
                medications: { where: { isActive: true } },
                appointments: { where: { status: 'SCHEDULED' } },
                doctors: true,
              },
            },
          },
          orderBy: { fullName: 'asc' },
        }),
      CACHE_TTL.CARE_RECIPIENT,
    );
  }

  async findOne(id: string, userId: string) {
    await this.verifyCareRecipientAccess(id, userId);

    const cacheKey = CACHE_KEYS.CARE_RECIPIENT(id);

    return this.cacheService.getOrSet(
      cacheKey,
      () =>
        this.prisma.careRecipient.findUnique({
          where: { id },
          include: {
            doctors: true,
            emergencyContacts: { orderBy: { isPrimary: 'desc' } },
            medications: { where: { isActive: true } },
            _count: {
              select: {
                appointments: { where: { status: 'SCHEDULED' } },
                timelineEntries: true,
              },
            },
          },
        }),
      CACHE_TTL.CARE_RECIPIENT,
    );
  }

  async update(id: string, userId: string, dto: Partial<CreateCareRecipientDto>) {
    const { membership } = await this.verifyCareRecipientAccess(id, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot update care recipients');
    }

    return this.prisma.careRecipient.update({
      where: { id },
      data: {
        fullName: dto.fullName,
        preferredName: dto.preferredName,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        bloodType: dto.bloodType,
        allergies: dto.allergies,
        conditions: dto.conditions,
        notes: dto.notes,
        primaryHospital: dto.preferredHospital,
        hospitalAddress: dto.preferredHospitalAddress,
        insuranceProvider: dto.insuranceProvider,
        insurancePolicyNo: dto.insurancePolicyNumber,
        photoUrl: dto.avatarUrl,
      },
    });
  }

  async delete(id: string, userId: string) {
    const { membership } = await this.verifyCareRecipientAccess(id, userId);

    if (membership.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can delete care recipients');
    }

    await this.prisma.careRecipient.delete({
      where: { id },
    });

    return { success: true };
  }

  // Doctor management
  async addDoctor(careRecipientId: string, userId: string, dto: CreateDoctorDto) {
    const { membership } = await this.verifyCareRecipientAccess(careRecipientId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot add doctors');
    }

    return this.prisma.doctor.create({
      data: {
        careRecipient: { connect: { id: careRecipientId } },
        name: dto.name,
        specialty: dto.specialty || '',
        phone: dto.phone || '',
        fax: dto.fax,
        email: dto.email,
        address: dto.address,
        notes: dto.notes,
      },
    });
  }

  async getDoctors(careRecipientId: string, userId: string) {
    await this.verifyCareRecipientAccess(careRecipientId, userId);

    return this.prisma.doctor.findMany({
      where: { careRecipientId },
      orderBy: { specialty: 'asc' },
    });
  }

  async updateDoctor(doctorId: string, userId: string, dto: Partial<CreateDoctorDto>) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const { membership } = await this.verifyCareRecipientAccess(doctor.careRecipientId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot update doctors');
    }

    return this.prisma.doctor.update({
      where: { id: doctorId },
      data: dto,
    });
  }

  async deleteDoctor(doctorId: string, userId: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const { membership } = await this.verifyCareRecipientAccess(doctor.careRecipientId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot delete doctors');
    }

    await this.prisma.doctor.delete({
      where: { id: doctorId },
    });

    return { success: true };
  }

  // Emergency contacts management
  async addEmergencyContact(careRecipientId: string, userId: string, dto: CreateEmergencyContactDto) {
    const { membership } = await this.verifyCareRecipientAccess(careRecipientId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot add emergency contacts');
    }

    // If this is primary, unset other primaries
    if (dto.isPrimary) {
      await this.prisma.emergencyContact.updateMany({
        where: { careRecipientId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return this.prisma.emergencyContact.create({
      data: {
        careRecipientId,
        ...dto,
      },
    });
  }

  async getEmergencyContacts(careRecipientId: string, userId: string) {
    await this.verifyCareRecipientAccess(careRecipientId, userId);

    return this.prisma.emergencyContact.findMany({
      where: { careRecipientId },
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    });
  }

  async deleteEmergencyContact(contactId: string, userId: string) {
    const contact = await this.prisma.emergencyContact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      throw new NotFoundException('Emergency contact not found');
    }

    const { membership } = await this.verifyCareRecipientAccess(contact.careRecipientId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot delete emergency contacts');
    }

    await this.prisma.emergencyContact.delete({
      where: { id: contactId },
    });

    return { success: true };
  }
}

