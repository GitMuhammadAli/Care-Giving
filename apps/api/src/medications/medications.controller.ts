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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { MedicationsService } from './medications.service';
import { MedicationInteractionsService } from './medication-interactions.service';
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

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a medication (Admin only)' })
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.medicationsService.delete(id, user.id);
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

// Medication Interactions Controller
@ApiTags('Medication Interactions')
@ApiBearerAuth('JWT-auth')
@Controller('care-recipients/:careRecipientId/medications/interactions')
export class MedicationInteractionsController {
  constructor(
    private readonly interactionsService: MedicationInteractionsService,
  ) {}

  @Get()
  @ApiOperation({ 
    summary: 'Check for drug interactions among current medications',
    description: 'Analyzes all active medications for potential drug interactions and returns warnings grouped by severity.',
  })
  checkCurrentInteractions(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
  ) {
    return this.interactionsService.checkCareRecipientMedications(careRecipientId);
  }

  @Post('check-new')
  @ApiOperation({ 
    summary: 'Check if adding a new medication would cause interactions',
    description: 'Checks potential interactions between a new medication and existing active medications.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['medicationName'],
      properties: {
        medicationName: { type: 'string', example: 'Warfarin' },
        genericName: { type: 'string', example: 'warfarin sodium' },
      },
    },
  })
  checkNewMedication(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @Body() body: { medicationName: string; genericName?: string },
  ) {
    return this.interactionsService.checkNewMedicationInteractions(
      careRecipientId,
      body.medicationName,
      body.genericName,
    );
  }
}

// Global interactions check (not care-recipient specific)
@ApiTags('Medication Interactions')
@ApiBearerAuth('JWT-auth')
@Controller('medications/interactions')
export class GlobalInteractionsController {
  constructor(
    private readonly interactionsService: MedicationInteractionsService,
  ) {}

  @Post('check')
  @ApiOperation({ 
    summary: 'Check for interactions between a list of medications',
    description: 'Pass a list of medication names to check for potential drug interactions.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['medications'],
      properties: {
        medications: { 
          type: 'array', 
          items: { type: 'string' },
          example: ['Warfarin', 'Aspirin', 'Lisinopril'],
        },
      },
    },
  })
  checkInteractions(@Body() body: { medications: string[] }) {
    return this.interactionsService.checkInteractions(body.medications);
  }

  @Get('details')
  @ApiOperation({ 
    summary: 'Get detailed information about a specific interaction',
    description: 'Returns detailed information about the interaction between two specific drugs.',
  })
  getInteractionDetails(
    @Query('drug1') drug1: string,
    @Query('drug2') drug2: string,
  ) {
    const interaction = this.interactionsService.getInteractionDetails(drug1, drug2);
    if (!interaction) {
      return { found: false, message: 'No known interaction between these medications.' };
    }
    return { found: true, interaction };
  }

  @Get('known')
  @ApiOperation({ 
    summary: 'Get list of all known interactions in the database',
    description: 'Returns the full list of known drug interactions for reference.',
  })
  getAllKnownInteractions() {
    return {
      total: this.interactionsService.getAllKnownInteractions().length,
      interactions: this.interactionsService.getAllKnownInteractions(),
    };
  }
}
