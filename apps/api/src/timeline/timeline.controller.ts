import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TimelineService } from './service/timeline.service';
import { CreateTimelineEntryDto } from './dto/create-timeline-entry.dto';
import { TimelineEntryType } from './entity/timeline-entry.entity';

@ApiTags('Timeline')
@ApiBearerAuth()
@Controller('care-recipients/:careRecipientId/timeline')
export class TimelineController {
  constructor(private readonly timelineService: TimelineService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new timeline entry' })
  create(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @Body() dto: CreateTimelineEntryDto,
  ) {
    return this.timelineService.create(careRecipientId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all timeline entries for a care recipient' })
  findAll(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.timelineService.findAll(careRecipientId, limit || 50, offset || 0);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent timeline entries' })
  getRecent(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @Query('limit') limit?: number,
  ) {
    return this.timelineService.findRecent(careRecipientId, limit || 10);
  }

  @Get('by-type')
  @ApiOperation({ summary: 'Get timeline entries by type' })
  getByType(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @Query('types') types: string,
    @Query('limit') limit?: number,
  ) {
    const typeArray = types.split(',') as TimelineEntryType[];
    return this.timelineService.findByType(careRecipientId, typeArray, limit || 50);
  }

  @Get('vitals')
  @ApiOperation({ summary: 'Get vitals history' })
  getVitalsHistory(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @Query('days') days?: number,
  ) {
    return this.timelineService.getVitalsHistory(careRecipientId, days || 30);
  }

  @Get('vitals/summary')
  @ApiOperation({ summary: 'Get vitals summary' })
  getVitalsSummary(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
  ) {
    return this.timelineService.getVitalsSummary(careRecipientId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a timeline entry by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.timelineService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a timeline entry' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.timelineService.remove(id);
  }
}
