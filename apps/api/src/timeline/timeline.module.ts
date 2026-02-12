import { Module, forwardRef } from '@nestjs/common';
import { TimelineService } from './timeline.service';
import { TimelineController, CareRecipientTimelineController, ActivityFeedController } from './timeline.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [forwardRef(() => NotificationsModule), AiModule],
  controllers: [CareRecipientTimelineController, TimelineController, ActivityFeedController],
  providers: [TimelineService],
  exports: [TimelineService],
})
export class TimelineModule {}
