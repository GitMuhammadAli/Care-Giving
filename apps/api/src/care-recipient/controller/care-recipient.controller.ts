import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { CareRecipientService } from '../service/care-recipient.service';
import { CreateCareRecipientDto } from '../dto/create-care-recipient.dto';
import { CreateDoctorDto } from '../dto/create-doctor.dto';
import { CreateEmergencyContactDto } from '../dto/create-emergency-contact.dto';

import { JwtAuthGuard } from '../../system/guard/jwt-auth.guard';
import { FamilyAccessGuard } from '../../system/guard/family-access.guard';
import { FamilyAccess } from '../../system/decorator/family-access.decorator';

@ApiTags('care-recipients')
@ApiBearerAuth()
@Controller('families/:familyId/care-recipients')
@UseGuards(JwtAuthGuard, FamilyAccessGuard)
@FamilyAccess()
export class CareRecipientController {
  constructor(private readonly careRecipientService: CareRecipientService) {}

  @Post()
  @ApiOperation({ summary: 'Create care recipient' })
  async create(
    @Param('familyId') familyId: string,
    @Body() dto: CreateCareRecipientDto,
  ) {
    return this.careRecipientService.create(familyId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get family care recipients' })
  async findAll(@Param('familyId') familyId: string) {
    return this.careRecipientService.findByFamily(familyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get care recipient by ID' })
  async findOne(@Param('id') id: string) {
    return this.careRecipientService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update care recipient' })
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateCareRecipientDto>,
  ) {
    return this.careRecipientService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete care recipient' })
  async remove(@Param('id') id: string) {
    await this.careRecipientService.delete(id);
  }

  // Doctors
  @Post(':id/doctors')
  @ApiOperation({ summary: 'Add doctor' })
  async addDoctor(@Param('id') id: string, @Body() dto: CreateDoctorDto) {
    return this.careRecipientService.addDoctor(id, dto);
  }

  @Put(':id/doctors/:doctorId')
  @ApiOperation({ summary: 'Update doctor' })
  async updateDoctor(
    @Param('doctorId') doctorId: string,
    @Body() dto: Partial<CreateDoctorDto>,
  ) {
    return this.careRecipientService.updateDoctor(doctorId, dto);
  }

  @Delete(':id/doctors/:doctorId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove doctor' })
  async removeDoctor(@Param('doctorId') doctorId: string) {
    await this.careRecipientService.removeDoctor(doctorId);
  }

  // Emergency Contacts
  @Post(':id/emergency-contacts')
  @ApiOperation({ summary: 'Add emergency contact' })
  async addEmergencyContact(
    @Param('id') id: string,
    @Body() dto: CreateEmergencyContactDto,
  ) {
    return this.careRecipientService.addEmergencyContact(id, dto);
  }

  @Put(':id/emergency-contacts/:contactId')
  @ApiOperation({ summary: 'Update emergency contact' })
  async updateEmergencyContact(
    @Param('contactId') contactId: string,
    @Body() dto: Partial<CreateEmergencyContactDto>,
  ) {
    return this.careRecipientService.updateEmergencyContact(contactId, dto);
  }

  @Delete(':id/emergency-contacts/:contactId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove emergency contact' })
  async removeEmergencyContact(@Param('contactId') contactId: string) {
    await this.careRecipientService.removeEmergencyContact(contactId);
  }
}

