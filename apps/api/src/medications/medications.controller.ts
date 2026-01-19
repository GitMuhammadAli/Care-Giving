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
import { MedicationsService } from './medications.service';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { LogMedicationDto } from './dto/log-medication.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface CurrentUserPayload {
  id: string;
  email: string;
}

@ApiTags('Medications')
@ApiBearerAuth('JWT-auth')
@Controller('care-recipients/:careRecipientId/medications')
export class MedicationsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new medication' })
  create(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateMedicationDto,
  ) {
    return this.medicationsService.create(careRecipientId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all medications for a care recipient' })
  findAll(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.medicationsService.findAll(careRecipientId, user.id, activeOnly !== 'false');
  }

  @Get('schedule/today')
  @ApiOperation({ summary: "Get today's medication schedule" })
  getTodaySchedule(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.medicationsService.getScheduleForDay(careRecipientId, user.id, new Date());
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a medication by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.medicationsService.findOne(id, user.id);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Get medication logs' })
  getLogs(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    return this.medicationsService.getMedicationLogs(id, user.id, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : 100,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a medication' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateMedicationDto,
  ) {
    return this.medicationsService.update(id, user.id, dto);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a medication' })
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.medicationsService.deactivate(id, user.id);
  }
}

@ApiTags('Medication Logs')
@ApiBearerAuth('JWT-auth')
@Controller('medications')
export class MedicationLogsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  @Post(':medicationId/log')
  @ApiOperation({ summary: 'Log a medication (given/skipped)' })
  logMedication(
    @Param('medicationId', ParseUUIDPipe) medicationId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: LogMedicationDto,
  ) {
    return this.medicationsService.logMedication(medicationId, user.id, dto);
  }
}
