import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CareRecipientsService } from './care-recipients.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { CreateCareRecipientDto } from './dto/create-care-recipient.dto';
import { UpdateCareRecipientDto } from './dto/update-care-recipient.dto';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { CreateEmergencyContactDto } from './dto/create-emergency-contact.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class CareRecipientsController {
  constructor(private service: CareRecipientsService) {}

  // Care Recipients
  @Post('families/:familyId/care-recipients')
  create(
    @Param('familyId') familyId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateCareRecipientDto,
  ) {
    return this.service.create(familyId, user.id, dto);
  }

  @Get('families/:familyId/care-recipients')
  list(
    @Param('familyId') familyId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.findAll(familyId, user.id);
  }

  @Get('care-recipients/:id')
  get(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findOne(id, user.id);
  }

  @Patch('care-recipients/:id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateCareRecipientDto,
  ) {
    return this.service.update(id, user.id, dto);
  }

  @Delete('care-recipients/:id')
  delete(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.delete(id, user.id);
  }

  // Doctors
  @Post('care-recipients/:careRecipientId/doctors')
  addDoctor(
    @Param('careRecipientId') careRecipientId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateDoctorDto,
  ) {
    return this.service.addDoctor(careRecipientId, user.id, dto);
  }

  @Get('care-recipients/:careRecipientId/doctors')
  getDoctors(
    @Param('careRecipientId') careRecipientId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.getDoctors(careRecipientId, user.id);
  }

  @Patch('doctors/:doctorId')
  updateDoctor(
    @Param('doctorId') doctorId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: Partial<CreateDoctorDto>,
  ) {
    return this.service.updateDoctor(doctorId, user.id, dto);
  }

  @Delete('doctors/:doctorId')
  deleteDoctor(
    @Param('doctorId') doctorId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.deleteDoctor(doctorId, user.id);
  }

  // Emergency Contacts
  @Post('care-recipients/:careRecipientId/emergency-contacts')
  addEmergencyContact(
    @Param('careRecipientId') careRecipientId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateEmergencyContactDto,
  ) {
    return this.service.addEmergencyContact(careRecipientId, user.id, dto);
  }

  @Get('care-recipients/:careRecipientId/emergency-contacts')
  getEmergencyContacts(
    @Param('careRecipientId') careRecipientId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.getEmergencyContacts(careRecipientId, user.id);
  }

  @Delete('emergency-contacts/:contactId')
  deleteEmergencyContact(
    @Param('contactId') contactId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.deleteEmergencyContact(contactId, user.id);
  }
}

