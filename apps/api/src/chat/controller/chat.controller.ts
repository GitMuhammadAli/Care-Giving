import { Controller, Get, Post, Body, Param, UseGuards, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from '../service/chat.service';
import { CurrentUser } from '../../system/decorator/current-user.decorator';
import { FamilyAccessGuard } from '../../system/guard/family-access.guard';
import { FamilyAccess } from '../../system/decorator/family-access.decorator';
import { FamilyRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Chat')
@ApiBearerAuth('JWT-auth')
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly prisma: PrismaService
  ) {}

  @Get('token')
  @ApiOperation({ summary: 'Get Stream Chat user token and sync user' })
  async getUserToken(@CurrentUser('id') userId: string) {
    // Check if Stream Chat is configured first
    if (!this.chatService.isConfigured()) {
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Stream Chat not configured',
          configured: false,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // Get user info and sync to Stream Chat
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, avatarUrl: true },
    });

    if (user) {
      // Sync user to Stream Chat so they can connect
      await this.chatService.syncUser(user.id, user.fullName, user.avatarUrl);
    }

    const token = this.chatService.generateUserToken(userId);
    return {
      token,
      userId,
      userName: user?.fullName,
      userImage: user?.avatarUrl,
      configured: true,
    };
  }

  @Get('family/:familyId/init')
  @UseGuards(FamilyAccessGuard)
  @FamilyAccess({ param: 'familyId', roles: [FamilyRole.ADMIN, FamilyRole.CAREGIVER, FamilyRole.VIEWER] })
  @ApiOperation({ summary: 'Initialize family chat channel (creates if not exists, syncs all members)' })
  async initializeFamilyChat(
    @Param('familyId') familyId: string,
    @CurrentUser('id') userId: string
  ) {
    // Get family info
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      select: { id: true, name: true },
    });

    if (!family) {
      throw new ForbiddenException('Family not found');
    }

    // Get or create the family channel (syncs all users automatically)
    const channel = await this.chatService.getOrCreateFamilyChannel(
      familyId,
      family.name,
      userId
    );

    if (!channel) {
      return {
        success: false,
        configured: false,
        message: 'Stream Chat not configured',
      };
    }

    return {
      success: true,
      configured: true,
      channelId: channel.id,
      channelType: channel.type,
      familyName: family.name,
    };
  }

  @Post('family/:familyId/channel')
  @UseGuards(FamilyAccessGuard)
  @FamilyAccess({ param: 'familyId', roles: [FamilyRole.ADMIN, FamilyRole.CAREGIVER] })
  @ApiOperation({ summary: 'Create or get family chat channel (ADMIN/CAREGIVER only)' })
  async createFamilyChannel(
    @Param('familyId') familyId: string,
    @Body() dto: { familyName: string; memberIds?: string[] },
    @CurrentUser('id') userId: string
  ) {
    // Validate and get only family member IDs
    const validatedMemberIds = await this.chatService.validateAndGetFamilyMemberIds(
      familyId,
      dto.memberIds
    );

    const channel = await this.chatService.createFamilyChannel(
      familyId,
      dto.familyName,
      validatedMemberIds,
      userId
    );

    return {
      channelId: channel.id,
      channelType: channel.type,
    };
  }

  @Post('family/:familyId/topic')
  @UseGuards(FamilyAccessGuard)
  @FamilyAccess({ param: 'familyId', roles: [FamilyRole.ADMIN, FamilyRole.CAREGIVER] })
  @ApiOperation({ summary: 'Create care topic channel (ADMIN/CAREGIVER only)' })
  async createTopicChannel(
    @Param('familyId') familyId: string,
    @Body() dto: { topic: string; topicName: string; memberIds?: string[] },
    @CurrentUser('id') userId: string
  ) {
    // Validate and get only family member IDs
    const validatedMemberIds = await this.chatService.validateAndGetFamilyMemberIds(
      familyId,
      dto.memberIds
    );

    const channel = await this.chatService.createCareTopicChannel(
      familyId,
      dto.topic,
      dto.topicName,
      validatedMemberIds,
      userId
    );

    return {
      channelId: channel.id,
      channelType: channel.type,
    };
  }

  @Post('family/:familyId/member/:memberId')
  @UseGuards(FamilyAccessGuard)
  @FamilyAccess({ param: 'familyId', roles: [FamilyRole.ADMIN] })
  @ApiOperation({ summary: 'Add member to family chat channel (ADMIN only)' })
  async addMemberToChannel(
    @Param('familyId') familyId: string,
    @Param('memberId') memberId: string
  ) {
    // Validate the member belongs to the family
    const isMember = await this.chatService.isUserFamilyMember(familyId, memberId);
    if (!isMember) {
      throw new ForbiddenException('User is not a member of this family');
    }

    await this.chatService.addMemberToFamilyChannel(familyId, memberId);

    return { success: true, message: 'Member added to channel' };
  }

  @Get('channels')
  @ApiOperation({ summary: 'Get all channels for current user' })
  async getUserChannels(@CurrentUser('id') userId: string) {
    // First sync user to ensure they exist in Stream Chat
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, avatarUrl: true },
    });

    if (user) {
      await this.chatService.syncUser(user.id, user.fullName, user.avatarUrl);
    }

    const channels = await this.chatService.getUserChannels(userId);

    return channels.map((channel) => ({
      id: channel.id,
      type: channel.type,
      name: (channel.data as any)?.name,
      image: (channel.data as any)?.image,
      familyId: (channel.data as any)?.family_id,
      memberCount: Object.keys(channel.state.members).length,
      lastMessageAt: channel.state.last_message_at,
      unreadCount: channel.countUnread(),
    }));
  }

  @Get('status')
  @ApiOperation({ summary: 'Check if Stream Chat is configured' })
  getStreamChatStatus() {
    return {
      configured: this.chatService.isConfigured(),
    };
  }
}
