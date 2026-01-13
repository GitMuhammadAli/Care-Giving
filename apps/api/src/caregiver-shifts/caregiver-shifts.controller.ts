import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CaregiverShiftsService } from './service/caregiver-shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { CheckOutDto } from './dto/check-out.dto';

@ApiTags('Caregiver Shifts')
@ApiBearerAuth()
@Controller('care-recipients/:careRecipientId/shifts')
export class CaregiverShiftsController {
  constructor(private readonly shiftsService: CaregiverShiftsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new shift' })
  create(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @Body() dto: CreateShiftDto,
  ) {
    return this.shiftsService.create(careRecipientId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all shifts for a care recipient' })
  findAll(@Param('careRecipientId', ParseUUIDPipe) careRecipientId: string) {
    return this.shiftsService.findAll(careRecipientId);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get the current shift' })
  getCurrentShift(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
  ) {
    return this.shiftsService.findCurrentShift(careRecipientId);
  }

  @Get('on-duty')
  @ApiOperation({ summary: 'Get who is currently on duty' })
  getOnDuty(@Param('careRecipientId', ParseUUIDPipe) careRecipientId: string) {
    return this.shiftsService.getOnDutyCaregiver(careRecipientId);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming shifts' })
  getUpcoming(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @Query('limit') limit?: number,
  ) {
    return this.shiftsService.findUpcoming(careRecipientId, limit || 5);
  }

  @Get('range')
  @ApiOperation({ summary: 'Get shifts by date range' })
  getByDateRange(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.shiftsService.findByDateRange(
      careRecipientId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a shift by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.shiftsService.findOne(id);
  }

  @Post(':id/checkin')
  @ApiOperation({ summary: 'Check in to a shift' })
  checkIn(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('notes') notes?: string,
    @Body('location') location?: string,
  ) {
    return this.shiftsService.checkIn(id, notes, location);
  }

  @Post(':id/checkout')
  @ApiOperation({ summary: 'Check out from a shift' })
  checkOut(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CheckOutDto,
  ) {
    return this.shiftsService.checkOut(id, dto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a shift' })
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.shiftsService.cancel(id);
  }
}

@ApiTags('My Shifts')
@ApiBearerAuth()
@Controller('my-shifts')
export class MyShiftsController {
  constructor(private readonly shiftsService: CaregiverShiftsService) {}

  @Get()
  @ApiOperation({ summary: 'Get my shifts' })
  getMyShifts(@Query('upcomingOnly') upcomingOnly?: string) {
    return this.shiftsService.getMyCaregiverShifts(upcomingOnly === 'true');
  }
}
