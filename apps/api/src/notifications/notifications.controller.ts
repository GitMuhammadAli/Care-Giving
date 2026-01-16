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

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for current user' })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.getNotifications(
      user.id,
      unreadOnly === 'true',
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get('unread/count')
  @ApiOperation({ summary: 'Get unread notification count' })
  getUnreadCount(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.getUnreadCount(user.id);
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
