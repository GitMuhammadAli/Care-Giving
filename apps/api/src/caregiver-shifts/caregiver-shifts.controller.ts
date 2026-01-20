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
import { CaregiverShiftsService } from './caregiver-shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface CurrentUserPayload {
  id: string;
  email: string;
}

@ApiTags('Caregiver Shifts')
@ApiBearerAuth('JWT-auth')
@Controller('care-recipients/:careRecipientId/shifts')
export class CaregiverShiftsController {
  constructor(private readonly shiftsService: CaregiverShiftsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new shift' })
  create(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateShiftDto,
  ) {
    return this.shiftsService.createShift(careRecipientId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all shifts for a care recipient' })
  getAll(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.shiftsService.getAll(careRecipientId, user.id);
  }

  @Get('range')
  @ApiOperation({ summary: 'Get shifts within a date range' })
  getByDateRange(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.shiftsService.getByDateRange(
      careRecipientId,
      user.id,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('current')
  @ApiOperation({ summary: 'Get the current shift' })
  getCurrentShift(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
  ) {
    return this.shiftsService.getCurrentShift(careRecipientId);
  }

  @Get('on-duty')
  @ApiOperation({ summary: 'Get who is currently on duty' })
  getOnDuty(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.shiftsService.getOnDuty(careRecipientId, user.id);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming shifts' })
  getUpcoming(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('days') days?: string,
    @Query('limit') limit?: string,
  ) {
    return this.shiftsService.getUpcoming(careRecipientId, user.id, days ? parseInt(days, 10) : 7);
  }

  @Get('day')
  @ApiOperation({ summary: 'Get shifts for a specific day' })
  getForDay(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('date') date: string,
  ) {
    return this.shiftsService.getForDay(careRecipientId, user.id, new Date(date));
  }

  @Get(':shiftId')
  @ApiOperation({ summary: 'Get a specific shift by ID' })
  getById(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @Param('shiftId', ParseUUIDPipe) shiftId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.shiftsService.getById(careRecipientId, shiftId, user.id);
  }

  @Post(':id/checkin')
  @ApiOperation({ summary: 'Check in to a shift' })
  checkIn(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.shiftsService.checkIn(id, user.id);
  }

  @Post(':id/checkout')
  @ApiOperation({ summary: 'Check out from a shift' })
  checkOut(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CheckOutDto,
  ) {
    return this.shiftsService.checkOut(id, user.id, dto.handoffNotes);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm a shift' })
  confirmShift(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.shiftsService.confirmShift(id, user.id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a shift' })
  cancelShift(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.shiftsService.cancelShift(id, user.id);
  }
}

@ApiTags('My Shifts')
@ApiBearerAuth('JWT-auth')
@Controller('my-shifts')
export class MyShiftsController {
  constructor(private readonly shiftsService: CaregiverShiftsService) {}

  @Get()
  @ApiOperation({ summary: 'Get my shifts' })
  getMyShifts(
    @CurrentUser() user: CurrentUserPayload,
    @Query('upcomingOnly') upcomingOnly?: string,
  ) {
    return this.shiftsService.getMyShifts(user.id, upcomingOnly === 'true');
  }
}
