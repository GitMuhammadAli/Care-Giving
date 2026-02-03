import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';

import { UserService } from './user.service';
import { GetUser } from '../system/decorator/current-user.decorator';
import { CurrentUser } from '../system/helper/context.helper';

@ApiTags('User')
@ApiBearerAuth('JWT-auth')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Get notification preferences
   */
  @Get('preferences/notifications')
  @ApiOperation({
    summary: 'Get notification preferences',
    description: 'Retrieves the current user notification preferences.',
  })
  @ApiResponse({ status: 200, description: 'Preferences retrieved successfully' })
  async getNotificationPreferences(@GetUser() user: CurrentUser) {
    const prefs = await this.userService.getNotificationPreferences(user.id);
    return {
      emergencyAlerts: true, // Always enabled
      medicationReminders: prefs?.notifications?.medicationReminders ?? true,
      appointmentReminders: prefs?.notifications?.appointmentReminders ?? true,
      shiftReminders: prefs?.notifications?.shiftReminders ?? true,
      familyActivity: prefs?.notifications?.familyActivity ?? false,
      email: prefs?.notifications?.email ?? true,
      push: prefs?.notifications?.push ?? true,
      sms: prefs?.notifications?.sms ?? false,
    };
  }

  /**
   * Update notification preferences
   */
  @Patch('preferences/notifications')
  @ApiOperation({
    summary: 'Update notification preferences',
    description: 'Updates the user notification preferences.',
  })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  async updateNotificationPreferences(
    @GetUser() user: CurrentUser,
    @Body() preferences: Record<string, boolean>,
  ) {
    await this.userService.updateNotificationPreferences(user.id, preferences);
    return {
      success: true,
      message: 'Notification preferences updated',
    };
  }

  /**
   * GDPR Data Export - Export all user data
   */
  @Get('export')
  @Throttle({ default: { limit: 2, ttl: 3600000 } }) // 2 per hour
  @ApiOperation({
    summary: 'Export all user data (GDPR)',
    description: 'Exports all data associated with the current user for GDPR data portability compliance.',
  })
  @ApiResponse({ status: 200, description: 'Data export successful' })
  @ApiResponse({ status: 429, description: 'Too many export requests' })
  async exportData(@GetUser() user: CurrentUser) {
    const data = await this.userService.exportUserData(user.id);
    return {
      success: true,
      message: 'Your data has been exported successfully',
      data,
    };
  }

  /**
   * GDPR Data Export - Download as JSON file
   */
  @Get('export/download')
  @Throttle({ default: { limit: 2, ttl: 3600000 } }) // 2 per hour
  @ApiOperation({
    summary: 'Download user data as JSON file (GDPR)',
    description: 'Downloads all user data as a JSON file for GDPR data portability.',
  })
  @ApiResponse({ status: 200, description: 'File download started' })
  async downloadData(@GetUser() user: CurrentUser, @Res() res: Response) {
    const data = await this.userService.exportUserData(user.id);
    
    const filename = `carecircle-export-${user.id}-${new Date().toISOString().split('T')[0]}.json`;
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(data, null, 2));
  }

  /**
   * GDPR Data Deletion - Request account deletion
   */
  @Delete('delete-account')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 1, ttl: 86400000 } }) // 1 per day
  @ApiOperation({
    summary: 'Delete user account and data (GDPR)',
    description: 'Permanently deletes the user account and anonymizes all associated data. This action cannot be undone.',
  })
  @ApiResponse({ status: 200, description: 'Account deletion initiated' })
  @ApiResponse({ status: 429, description: 'Too many deletion requests' })
  async deleteAccount(@GetUser() user: CurrentUser) {
    const result = await this.userService.deleteUserData(user.id);
    return {
      success: true,
      message: 'Your account and associated data have been deleted',
      ...result,
    };
  }
}

