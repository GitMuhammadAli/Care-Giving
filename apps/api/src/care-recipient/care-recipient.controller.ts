import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CareRecipientService } from './care-recipient.service';
import { CreateCareRecipientDto } from './dto/create-care-recipient.dto';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { CreateEmergencyContactDto } from './dto/create-emergency-contact.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface CurrentUserPayload {
  id: string;
  email: string;
}

@ApiTags('Care Recipients')
@ApiBearerAuth('JWT-auth')
@Controller()
export class CareRecipientController {
  constructor(private readonly careRecipientService: CareRecipientService) {}

  // ============================================
  // CARE RECIPIENT CRUD
  // ============================================

  @Post('families/:familyId/care-recipients')
  @ApiOperation({ summary: 'Create a new care recipient' })
  create(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateCareRecipientDto,
  ) {
    return this.careRecipientService.create(familyId, user.id, dto);
  }

  @Get('families/:familyId/care-recipients')
  @ApiOperation({ summary: 'Get all care recipients in a family' })
  findAll(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.careRecipientService.findAll(familyId, user.id);
  }

  @Get('care-recipients/:id')
  @ApiOperation({ summary: 'Get a care recipient by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.careRecipientService.findOne(id, user.id);
  }

  @Patch('care-recipients/:id')
  @ApiOperation({ summary: 'Update a care recipient' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: Partial<CreateCareRecipientDto>,
  ) {
    return this.careRecipientService.update(id, user.id, dto);
  }

  @Delete('care-recipients/:id')
  @ApiOperation({ summary: 'Delete a care recipient' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.careRecipientService.delete(id, user.id);
  }

  // ============================================
  // DOCTOR MANAGEMENT
  // ============================================

  @Post('care-recipients/:careRecipientId/doctors')
  @ApiOperation({ summary: 'Add a doctor to a care recipient' })
  addDoctor(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateDoctorDto,
  ) {
    return this.careRecipientService.addDoctor(careRecipientId, user.id, dto);
  }

  @Get('care-recipients/:careRecipientId/doctors')
  @ApiOperation({ summary: 'Get all doctors for a care recipient' })
  getDoctors(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.careRecipientService.getDoctors(careRecipientId, user.id);
  }

  @Patch('doctors/:doctorId')
  @ApiOperation({ summary: 'Update a doctor' })
  updateDoctor(
    @Param('doctorId', ParseUUIDPipe) doctorId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: Partial<CreateDoctorDto>,
  ) {
    return this.careRecipientService.updateDoctor(doctorId, user.id, dto);
  }

  @Delete('doctors/:doctorId')
  @ApiOperation({ summary: 'Delete a doctor' })
  deleteDoctor(
    @Param('doctorId', ParseUUIDPipe) doctorId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.careRecipientService.deleteDoctor(doctorId, user.id);
  }

  // ============================================
  // EMERGENCY CONTACT MANAGEMENT
  // ============================================

  @Post('care-recipients/:careRecipientId/emergency-contacts')
  @ApiOperation({ summary: 'Add an emergency contact to a care recipient' })
  addEmergencyContact(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateEmergencyContactDto,
  ) {
    return this.careRecipientService.addEmergencyContact(careRecipientId, user.id, dto);
  }

  @Get('care-recipients/:careRecipientId/emergency-contacts')
  @ApiOperation({ summary: 'Get all emergency contacts for a care recipient' })
  getEmergencyContacts(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.careRecipientService.getEmergencyContacts(careRecipientId, user.id);
  }

  @Delete('emergency-contacts/:contactId')
  @ApiOperation({ summary: 'Delete an emergency contact' })
  deleteEmergencyContact(
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.careRecipientService.deleteEmergencyContact(contactId, user.id);
  }
}
