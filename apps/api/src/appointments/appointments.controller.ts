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
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AppointmentsService } from "./appointments.service";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { UpdateAppointmentDto } from "./dto/update-appointment.dto";
import { AssignTransportDto } from "./dto/assign-transport.dto";
import { CurrentUser } from "../common/decorators/current-user.decorator";

interface CurrentUserPayload {
  id: string;
  email: string;
}

@ApiTags("Appointments")
@ApiBearerAuth('JWT-auth')
@Controller("care-recipients/:careRecipientId/appointments")
export class CareRecipientAppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @ApiOperation({ summary: "Create a new appointment" })
  create(
    @Param("careRecipientId", ParseUUIDPipe) careRecipientId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateAppointmentDto
  ) {
    return this.appointmentsService.create(careRecipientId, user.id, dto);
  }

  @Post("recurring")
  @ApiOperation({ 
    summary: "Create a recurring appointment series",
    description: "Creates multiple appointments based on a recurrence pattern (daily, weekly, biweekly, monthly) or an RRULE string"
  })
  createRecurringSeries(
    @Param("careRecipientId", ParseUUIDPipe) careRecipientId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateAppointmentDto,
    @Query("maxOccurrences") maxOccurrences?: string
  ) {
    return this.appointmentsService.createRecurringSeries(
      careRecipientId,
      user.id,
      dto,
      maxOccurrences ? parseInt(maxOccurrences, 10) : 52
    );
  }

  @Get("recurring/series")
  @ApiOperation({ summary: "Get all recurring appointment series" })
  getRecurringSeries(
    @Param("careRecipientId", ParseUUIDPipe) careRecipientId: string,
    @CurrentUser() user: CurrentUserPayload
  ) {
    return this.appointmentsService.getRecurringSeries(careRecipientId, user.id);
  }

  @Get()
  @ApiOperation({ summary: "Get all appointments for a care recipient" })
  findAll(
    @Param("careRecipientId", ParseUUIDPipe) careRecipientId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("status") status?: string
  ) {
    return this.appointmentsService.findAll(careRecipientId, user.id, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status,
    });
  }

  @Get("upcoming")
  @ApiOperation({ summary: "Get upcoming appointments" })
  getUpcoming(
    @Param("careRecipientId", ParseUUIDPipe) careRecipientId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query("days") days?: string
  ) {
    return this.appointmentsService.findUpcoming(
      careRecipientId,
      user.id,
      days ? parseInt(days, 10) : 30
    );
  }

  @Get("day")
  @ApiOperation({ summary: "Get appointments for a specific day" })
  getForDay(
    @Param("careRecipientId", ParseUUIDPipe) careRecipientId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query("date") date: string
  ) {
    return this.appointmentsService.findForDay(
      careRecipientId,
      user.id,
      new Date(date)
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Get an appointment by ID" })
  findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload
  ) {
    return this.appointmentsService.findOne(id, user.id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update an appointment" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateAppointmentDto
  ) {
    return this.appointmentsService.update(id, user.id, dto);
  }

  @Patch(":id/cancel")
  @ApiOperation({ summary: "Cancel an appointment" })
  cancel(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload
  ) {
    return this.appointmentsService.cancel(id, user.id);
  }

  @Post(":id/transport")
  @ApiOperation({ summary: "Assign transport for appointment" })
  assignTransport(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: AssignTransportDto
  ) {
    return this.appointmentsService.assignTransport(id, user.id, dto);
  }

  @Post(":id/transport/confirm")
  @ApiOperation({ summary: "Confirm transport assignment" })
  confirmTransport(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload
  ) {
    return this.appointmentsService.confirmTransport(id, user.id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete an appointment (Admin only)" })
  delete(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload
  ) {
    return this.appointmentsService.delete(id, user.id);
  }
}

// Top-level appointments controller for direct ID access
@ApiTags("Appointments")
@ApiBearerAuth('JWT-auth')
@Controller("appointments")
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get(":id")
  @ApiOperation({ summary: "Get an appointment by ID" })
  findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload
  ) {
    return this.appointmentsService.findOne(id, user.id);
  }

  @Get(":id/occurrences")
  @ApiOperation({ 
    summary: "Get expanded occurrences from a recurring appointment",
    description: "Returns all occurrences of a recurring appointment within a date range"
  })
  getRecurringOccurrences(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string
  ) {
    return this.appointmentsService.getRecurringOccurrences(
      id,
      user.id,
      new Date(startDate),
      new Date(endDate)
    );
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update an appointment" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateAppointmentDto
  ) {
    return this.appointmentsService.update(id, user.id, dto);
  }

  @Patch(":id/cancel")
  @ApiOperation({ summary: "Cancel an appointment" })
  cancel(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload
  ) {
    return this.appointmentsService.cancel(id, user.id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete an appointment (Admin only)" })
  delete(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload
  ) {
    return this.appointmentsService.delete(id, user.id);
  }

  @Post(":id/transport")
  @ApiOperation({ summary: "Assign transport for appointment" })
  assignTransport(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: AssignTransportDto
  ) {
    return this.appointmentsService.assignTransport(id, user.id, dto);
  }
}

// Recurring series management controller
@ApiTags("Recurring Appointments")
@ApiBearerAuth('JWT-auth')
@Controller("appointments/series")
export class RecurringAppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Patch(":seriesId")
  @ApiOperation({ 
    summary: "Update all future appointments in a recurring series",
    description: "Updates all appointments in a series from a given date onwards"
  })
  updateSeries(
    @Param("seriesId") seriesId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateAppointmentDto,
    @Query("fromDate") fromDate?: string
  ) {
    return this.appointmentsService.updateRecurringSeries(
      seriesId,
      user.id,
      dto,
      fromDate ? new Date(fromDate) : undefined
    );
  }

  @Patch(":seriesId/cancel")
  @ApiOperation({ 
    summary: "Cancel all future appointments in a recurring series",
    description: "Cancels all active appointments in a series from a given date onwards"
  })
  cancelSeries(
    @Param("seriesId") seriesId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query("fromDate") fromDate?: string
  ) {
    return this.appointmentsService.cancelRecurringSeries(
      seriesId,
      user.id,
      fromDate ? new Date(fromDate) : undefined
    );
  }
}
