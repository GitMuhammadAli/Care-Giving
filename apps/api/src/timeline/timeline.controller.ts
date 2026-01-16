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
@ApiBearerAuth()
@Controller('care-recipients/:careRecipientId/timeline')
export class TimelineController {
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
