import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimelineEntry } from './entity/timeline-entry.entity';
import { TimelineEntryRepository } from './repository/timeline-entry.repository';
import { TimelineService } from './service/timeline.service';
import { TimelineController } from './timeline.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TimelineEntry])],
  controllers: [TimelineController],
  providers: [TimelineService, TimelineEntryRepository],
  exports: [TimelineService],
})
export class TimelineModule {}
