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
@ApiBearerAuth()
@Controller("care-recipients/:careRecipientId/appointments")
export class AppointmentsController {
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
}
