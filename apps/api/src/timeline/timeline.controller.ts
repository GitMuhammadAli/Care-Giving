import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TimelineService } from './timeline.service';
import { CreateTimelineEntryDto } from './dto/create-timeline-entry.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface CurrentUserPayload {
  id: string;
  email: string;
}

@ApiTags('Timeline')
@ApiBearerAuth('JWT-auth')
@Controller('care-recipients/:careRecipientId/timeline')
export class CareRecipientTimelineController {
  constructor(private readonly timelineService: TimelineService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new timeline entry' })
  create(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateTimelineEntryDto,
  ) {
    return this.timelineService.create(careRecipientId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all timeline entries for a care recipient' })
  findAll(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.timelineService.findAll(careRecipientId, user.id, {
      type,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('vitals')
  @ApiOperation({ summary: 'Get recent vitals' })
  getRecentVitals(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('days') days?: string,
  ) {
    return this.timelineService.getRecentVitals(careRecipientId, user.id, days ? parseInt(days, 10) : 7);
  }

  @Get('incidents')
  @ApiOperation({ summary: 'Get incidents' })
  getIncidents(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.timelineService.getIncidents(careRecipientId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a timeline entry by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.timelineService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a timeline entry' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: Partial<CreateTimelineEntryDto>,
  ) {
    return this.timelineService.update(id, user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a timeline entry' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.timelineService.delete(id, user.id);
  }
}

// Top-level timeline controller for direct ID access
@ApiTags('Timeline')
@ApiBearerAuth('JWT-auth')
@Controller('timeline')
export class TimelineController {
  constructor(private readonly timelineService: TimelineService) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Update a timeline entry' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: Partial<CreateTimelineEntryDto>,
  ) {
    return this.timelineService.update(id, user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a timeline entry' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.timelineService.delete(id, user.id);
  }
}

// Activity Feed controller for dashboard
@ApiTags('Activity Feed')
@ApiBearerAuth('JWT-auth')
@Controller('families/:familyId/activity')
export class ActivityFeedController {
  constructor(private readonly timelineService: TimelineService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Get activity feed for a family',
    description: 'Returns recent activities including timeline entries, medication logs, appointments, and emergency alerts.',
  })
  getActivityFeed(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('limit') limit?: string,
  ) {
    return this.timelineService.getActivityFeed(
      familyId, 
      user.id, 
      limit ? parseInt(limit, 10) : 20
    );
  }
}
