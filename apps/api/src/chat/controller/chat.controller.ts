import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from '../service/chat.service';
import { CurrentUser } from '../../system/decorator/current-user.decorator';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('token')
  @ApiOperation({ summary: 'Get Stream Chat user token' })
  getUserToken(@CurrentUser('id') userId: string) {
    const token = this.chatService.generateUserToken(userId);
    return { token };
  }

  @Post('family/:familyId/channel')
  @ApiOperation({ summary: 'Create or get family chat channel' })
  async createFamilyChannel(
    @Param('familyId') familyId: string,
    @Body() dto: { familyName: string; memberIds: string[] },
    @CurrentUser('id') userId: string
  ) {
    const channel = await this.chatService.createFamilyChannel(
      familyId,
      dto.familyName,
      dto.memberIds,
      userId
    );

    return {
      channelId: channel.id,
      channelType: channel.type,
    };
  }

  @Post('family/:familyId/topic')
  @ApiOperation({ summary: 'Create care topic channel' })
  async createTopicChannel(
    @Param('familyId') familyId: string,
    @Body() dto: { topic: string; topicName: string; memberIds: string[] },
    @CurrentUser('id') userId: string
  ) {
    const channel = await this.chatService.createCareTopicChannel(
      familyId,
      dto.topic,
      dto.topicName,
      dto.memberIds,
      userId
    );

    return {
      channelId: channel.id,
      channelType: channel.type,
    };
  }

  @Get('channels')
  @ApiOperation({ summary: 'Get all channels for current user' })
  async getUserChannels(@CurrentUser('id') userId: string) {
    const channels = await this.chatService.getUserChannels(userId);

    return channels.map((channel) => ({
      id: channel.id,
      type: channel.type,
      name: (channel.data as any)?.name,
      image: (channel.data as any)?.image,
      memberCount: Object.keys(channel.state.members).length,
      lastMessageAt: channel.state.last_message_at,
      unreadCount: channel.countUnread(),
    }));
  }
}
