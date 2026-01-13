import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AppointmentsService } from './service/appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentStatus } from './entity/appointment.entity';

@ApiTags('Appointments')
@ApiBearerAuth()
@Controller('care-recipients/:careRecipientId/appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new appointment' })
  create(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.create(careRecipientId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all appointments for a care recipient' })
  findAll(@Param('careRecipientId', ParseUUIDPipe) careRecipientId: string) {
    return this.appointmentsService.findAll(careRecipientId);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming appointments' })
  getUpcoming(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @Query('limit') limit?: number,
  ) {
    return this.appointmentsService.findUpcoming(careRecipientId, limit || 5);
  }

  @Get('range')
  @ApiOperation({ summary: 'Get appointments by date range' })
  getByDateRange(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.appointmentsService.findByDateRange(
      careRecipientId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an appointment by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointmentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an appointment' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update appointment status' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: AppointmentStatus,
  ) {
    return this.appointmentsService.updateStatus(id, status);
  }

  @Patch(':id/transport')
  @ApiOperation({ summary: 'Assign transport for appointment' })
  assignTransport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('userId') userId: string,
  ) {
    return this.appointmentsService.assignTransport(id, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an appointment' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointmentsService.remove(id);
  }
}
