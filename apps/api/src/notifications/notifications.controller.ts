import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './service/notifications.service';
import { CurrentUser } from '../system/decorator/current-user.decorator';
import { PushPlatform } from './entity/push-subscription.entity';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for current user' })
  findAll(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.notificationsService.findByUser(userId, limit || 50, offset || 0);
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread notifications' })
  getUnread(@CurrentUser('id') userId: string) {
    return this.notificationsService.findUnread(userId);
  }

  @Get('unread/count')
  @ApiOperation({ summary: 'Get unread notification count' })
  getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationsService.countUnread(userId);
  }

  @Patch('read')
  @ApiOperation({ summary: 'Mark notifications as read' })
  markAsRead(@Body('ids') ids: string[]) {
    return this.notificationsService.markAsRead(ids);
  }

  @Patch('read/all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllAsRead() {
    return this.notificationsService.markAllAsRead();
  }

  @Post('push-subscription')
  @ApiOperation({ summary: 'Subscribe to push notifications' })
  subscribeToPush(
    @Body()
    dto: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
      platform?: PushPlatform;
      deviceName?: string;
    },
  ) {
    return this.notificationsService.subscribeToPush(dto);
  }

  @Delete('push-subscription')
  @ApiOperation({ summary: 'Unsubscribe from push notifications' })
  unsubscribeFromPush(@Body('endpoint') endpoint: string) {
    return this.notificationsService.unsubscribeFromPush(endpoint);
  }
}
