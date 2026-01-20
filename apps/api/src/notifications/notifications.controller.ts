import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../system/decorator/current-user.decorator';
import { Platform as PushPlatform } from '@prisma/client';

interface CurrentUserPayload {
  id: string;
  email: string;
}

interface PushSubscriptionDto {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  platform?: 'web' | 'ios' | 'android';
  deviceName?: string;
}

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for current user' })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.notificationsService.getNotifications(
      user.id,
      unreadOnly === 'true',
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread notifications' })
  getUnread(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.getUnread(user.id);
  }

  @Get('unread/count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@CurrentUser() user: CurrentUserPayload) {
    const count = await this.notificationsService.getUnreadCount(user.id);
    return { count };
  }

  @Patch('read')
  @ApiOperation({ summary: 'Mark notifications as read (batch)' })
  markAsReadBatch(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: { ids: string[] },
  ) {
    return this.notificationsService.markMultipleAsRead(dto.ids, user.id);
  }

  @Patch(':notificationId/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  markAsRead(
    @Param('notificationId') notificationId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.notificationsService.markAsRead(notificationId, user.id);
  }

  @Patch('read/all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllAsRead(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Post('push-subscription')
  @ApiOperation({ summary: 'Subscribe to push notifications (web push)' })
  subscribeToPush(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: PushSubscriptionDto,
  ) {
    // Store the endpoint as the token for web push subscriptions
    const platform = (dto.platform?.toUpperCase() || 'WEB') as PushPlatform;
    return this.notificationsService.registerPushToken(user.id, dto.endpoint, platform);
  }

  @Delete('push-subscription')
  @ApiOperation({ summary: 'Unsubscribe from push notifications (web push)' })
  unsubscribeFromPush(@Body() dto: { endpoint: string }) {
    return this.notificationsService.removePushToken(dto.endpoint);
  }

  @Post('push-token')
  @ApiOperation({ summary: 'Register push notification token' })
  registerPushToken(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: { token: string; platform: PushPlatform },
  ) {
    return this.notificationsService.registerPushToken(user.id, dto.token, dto.platform);
  }

  @Delete('push-token')
  @ApiOperation({ summary: 'Remove push notification token' })
  removePushToken(@Body('token') token: string) {
    return this.notificationsService.removePushToken(token);
  }
}
