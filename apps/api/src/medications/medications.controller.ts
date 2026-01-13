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
import { MedicationsService } from './service/medications.service';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { LogMedicationDto } from './dto/log-medication.dto';

@ApiTags('Medications')
@ApiBearerAuth()
@Controller('care-recipients/:careRecipientId/medications')
export class MedicationsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new medication' })
  create(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @Body() dto: CreateMedicationDto,
  ) {
    return this.medicationsService.create(careRecipientId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all medications for a care recipient' })
  findAll(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.medicationsService.findAll(careRecipientId, activeOnly !== 'false');
  }

  @Get('schedule/today')
  @ApiOperation({ summary: "Get today's medication schedule" })
  getTodaySchedule(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
  ) {
    return this.medicationsService.getTodaySchedule(careRecipientId);
  }

  @Get('low-supply')
  @ApiOperation({ summary: 'Get medications with low supply' })
  getLowSupply(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
  ) {
    return this.medicationsService.getLowSupplyMedications(careRecipientId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a medication by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.medicationsService.findOne(id);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Get medication logs' })
  getLogs(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit?: number,
  ) {
    return this.medicationsService.getLogs(id, limit || 30);
  }

  @Get(':id/adherence')
  @ApiOperation({ summary: 'Get medication adherence stats' })
  getAdherence(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('days') days?: number,
  ) {
    return this.medicationsService.getAdherenceStats(id, days || 30);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a medication' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMedicationDto,
  ) {
    return this.medicationsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a medication' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.medicationsService.remove(id);
  }
}

@ApiTags('Medication Logs')
@ApiBearerAuth()
@Controller('medications')
export class MedicationLogsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  @Post(':medicationId/log')
  @ApiOperation({ summary: 'Log a medication (given/skipped)' })
  logMedication(
    @Param('medicationId', ParseUUIDPipe) medicationId: string,
    @Body() dto: LogMedicationDto,
  ) {
    return this.medicationsService.logMedication(medicationId, dto);
  }
}
