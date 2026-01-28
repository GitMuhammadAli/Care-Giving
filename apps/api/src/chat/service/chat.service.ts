import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StreamChat, Channel } from 'stream-chat';
import { PrismaService } from '../../prisma/prisma.service';

interface StreamUserData {
  id: string;
  name: string;
  image?: string;
  role?: string;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private streamClient: StreamChat | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {
    const apiKey = this.configService.get<string>('NEXT_PUBLIC_STREAM_API_KEY');
    const apiSecret = this.configService.get<string>('STREAM_API_SECRET');

    if (!apiKey || !apiSecret) {
      this.logger.warn(
        'Stream Chat not configured. Set NEXT_PUBLIC_STREAM_API_KEY and STREAM_API_SECRET'
      );
      return;
    }

    this.streamClient = StreamChat.getInstance(apiKey, apiSecret);
    this.logger.log('Stream Chat service initialized');
  }

  /**
   * Check if Stream Chat is configured
   */
  isConfigured(): boolean {
    return this.streamClient !== null;
  }

  /**
   * Sync/upsert a single user to Stream Chat
   * MUST be called before user can join channels
   */
  async syncUser(userId: string, name: string, avatarUrl?: string | null, role?: string): Promise<void> {
    if (!this.streamClient) {
      this.logger.warn('Stream Chat not configured, skipping user sync');
      return;
    }

    try {
      const userData: StreamUserData = {
        id: userId,
        name: name,
        image: avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      };

      if (role) {
        userData.role = role;
      }

      await this.streamClient.upsertUser(userData);
      this.logger.debug(`Synced user ${userId} (${name}) to Stream Chat`);
    } catch (error: any) {
      this.logger.error(`Failed to sync user ${userId} to Stream Chat: ${error.message}`);
      // Don't throw - chat sync failures shouldn't break the main flow
    }
  }

  /**
   * Sync multiple users to Stream Chat
   * Efficient batch operation
   */
  async syncUsers(users: Array<{ id: string; name: string; avatarUrl?: string | null; role?: string }>): Promise<void> {
    if (!this.streamClient) {
      this.logger.warn('Stream Chat not configured, skipping users sync');
      return;
    }

    if (users.length === 0) return;

    try {
      const streamUsers = users.map(user => ({
        id: user.id,
        name: user.name,
        image: user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`,
        role: user.role,
      }));

      await this.streamClient.upsertUsers(streamUsers);
      this.logger.log(`Synced ${users.length} users to Stream Chat`);
    } catch (error: any) {
      this.logger.error(`Failed to sync users to Stream Chat: ${error.message}`);
    }
  }

  /**
   * Sync all members of a family to Stream Chat and return their user IDs
   */
  async syncFamilyMembers(familyId: string): Promise<string[]> {
    const members = await this.prisma.familyMember.findMany({
      where: { familyId, isActive: true },
      include: {
        user: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
      },
    });

    if (members.length === 0) return [];

    const users = members.map(m => ({
      id: m.user.id,
      name: m.user.fullName,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
    }));

    await this.syncUsers(users);
    return members.map(m => m.userId);
  }

  /**
   * Sync a system user for sending system messages
   */
  async ensureSystemUser(): Promise<void> {
    if (!this.streamClient) return;

    try {
      await this.streamClient.upsertUser({
        id: 'system',
        name: 'CareCircle',
        image: '/icons/carecircle-logo.png',
        role: 'admin',
      });
      this.logger.debug('System user synced to Stream Chat');
    } catch (error: any) {
      this.logger.error(`Failed to create system user: ${error.message}`);
    }
  }

  /**
   * Validate that all memberIds belong to the family
   * If no memberIds provided, returns all active family member user IDs
   */
  async validateAndGetFamilyMemberIds(
    familyId: string,
    requestedMemberIds?: string[]
  ): Promise<string[]> {
    // Get all active family members
    const familyMembers = await this.prisma.familyMember.findMany({
      where: {
        familyId,
        isActive: true,
      },
      select: {
        userId: true,
      },
    });

    const validUserIds = new Set(familyMembers.map((m) => m.userId));

    // If no specific members requested, return all family members
    if (!requestedMemberIds || requestedMemberIds.length === 0) {
      return Array.from(validUserIds);
    }

    // Filter to only valid family member IDs
    const validatedIds = requestedMemberIds.filter((id) => validUserIds.has(id));

    this.logger.debug(
      `Validated ${validatedIds.length}/${requestedMemberIds.length} member IDs for family ${familyId}`
    );

    return validatedIds;
  }

  /**
   * Check if a user is a member of a family
   */
  async isUserFamilyMember(familyId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.familyMember.findUnique({
      where: {
        familyId_userId: {
          familyId,
          userId,
        },
      },
    });

    return !!member && member.isActive;
  }

  /**
   * Get user's role in a family
   */
  async getUserFamilyRole(familyId: string, userId: string): Promise<string | null> {
    const member = await this.prisma.familyMember.findUnique({
      where: {
        familyId_userId: {
          familyId,
          userId,
        },
      },
      select: {
        role: true,
      },
    });

    return member?.role || null;
  }

  /**
   * Generate user token for Stream Chat authentication
   */
  generateUserToken(userId: string): string {
    if (!this.streamClient) {
      throw new Error('Stream Chat not configured');
    }

    return this.streamClient.createToken(userId);
  }

  /**
   * Create or get family channel
   * All family members can communicate here
   * Automatically syncs users before creating channel
   */
  async createFamilyChannel(
    familyId: string,
    familyName: string,
    memberIds: string[],
    createdBy: string
  ): Promise<Channel> {
    if (!this.streamClient) {
      throw new Error('Stream Chat not configured');
    }

    // First, sync all family members to Stream Chat
    await this.syncFamilyMembers(familyId);
    await this.ensureSystemUser();

    const channelId = `family-${familyId}`;
    const members = memberIds || [];

    // Check if channel already exists
    try {
      const existingChannels = await this.streamClient.queryChannels({
        id: channelId,
        type: 'messaging',
      });

      if (existingChannels.length > 0) {
        this.logger.log(`Family channel ${channelId} already exists, returning existing`);
        // Update members if needed
        const channel = existingChannels[0];
        if (members.length > 0) {
          await channel.addMembers(members);
        }
        return channel;
      }
    } catch (error) {
      // Channel doesn't exist, create it
    }

    const channel = this.streamClient.channel('messaging', channelId, {
      name: `${familyName || 'Family'} Chat`,
      image: '/icons/family-chat.png',
      created_by_id: createdBy,
      members: members,
      family_id: familyId,
    } as any);

    await channel.create();

    this.logger.log(`Created family channel: ${channelId} with ${members.length} members`);

    return channel;
  }

  /**
   * Get or create family channel - safe method that handles both cases
   * Also ensures the requesting user is a member of the channel
   */
  async getOrCreateFamilyChannel(familyId: string, familyName: string, requestingUserId: string): Promise<Channel | null> {
    if (!this.streamClient) {
      this.logger.warn('Stream Chat not configured');
      return null;
    }

    try {
      // Sync all family members to Stream Chat first
      const memberIds = await this.syncFamilyMembers(familyId);
      await this.ensureSystemUser();

      const channelId = `family-${familyId}`;

      // Check if channel already exists
      const existingChannels = await this.streamClient.queryChannels({
        id: channelId,
        type: 'messaging',
      });

      if (existingChannels.length > 0) {
        const channel = existingChannels[0];
        
        // Ensure all current family members are in the channel
        // This fixes any users who were added to the family but not to the channel
        const currentMembers = Object.keys(channel.state.members);
        const missingMembers = memberIds.filter(id => !currentMembers.includes(id));
        
        if (missingMembers.length > 0) {
          this.logger.log(`Adding ${missingMembers.length} missing members to channel ${channelId}: ${missingMembers.join(', ')}`);
          await channel.addMembers(missingMembers);
        }

        this.logger.log(`Got existing family channel: ${channelId}`);
        return channel;
      }

      // Channel doesn't exist, create it with all family members
      this.logger.log(`Creating new family channel: ${channelId} with ${memberIds.length} members`);
      
      const channel = this.streamClient.channel('messaging', channelId, {
        name: `${familyName} Chat`,
        image: '/icons/family-chat.png',
        created_by_id: requestingUserId,
        members: memberIds,
        family_id: familyId,
      } as any);

      await channel.create();

      this.logger.log(`Created family channel: ${channelId}`);
      return channel;
    } catch (error: any) {
      this.logger.error(`Failed to get/create family channel: ${error.message}`);
      return null;
    }
  }

  /**
   * Add member to family channel
   * Syncs user to Stream Chat first, then adds them to the channel
   */
  async addMemberToFamilyChannel(familyId: string, userId: string): Promise<void> {
    if (!this.streamClient) {
      this.logger.warn('Stream Chat not configured');
      return;
    }

    // Get user info and sync to Stream Chat first
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, avatarUrl: true },
    });

    if (!user) {
      this.logger.error(`User ${userId} not found, cannot add to channel`);
      return;
    }

    // Sync user to Stream Chat - this is REQUIRED before adding to channel
    await this.syncUser(user.id, user.fullName, user.avatarUrl);
    this.logger.log(`Synced user ${userId} (${user.fullName}) to Stream Chat`);

    const channelId = `family-${familyId}`;

    try {
      // First, query the channel to make sure it exists
      const existingChannels = await this.streamClient.queryChannels({
        id: channelId,
        type: 'messaging',
      });

      if (existingChannels.length === 0) {
        // Channel doesn't exist - get family info and create it
        const family = await this.prisma.family.findUnique({
          where: { id: familyId },
          select: { name: true },
        });

        this.logger.log(`Family channel ${channelId} doesn't exist, creating it first`);
        
        // Create the channel with the new user as a member
        const channel = this.streamClient.channel('messaging', channelId, {
          name: `${family?.name || 'Family'} Chat`,
          image: '/icons/family-chat.png',
          created_by_id: userId,
          members: [userId],
          family_id: familyId,
        } as any);
        
        await channel.create();
        this.logger.log(`Created family channel ${channelId} with user ${userId}`);
      } else {
        // Channel exists - add the member
        const channel = existingChannels[0];
        await channel.addMembers([userId]);
        this.logger.log(`Added user ${userId} to existing family channel ${channelId}`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to add user ${userId} to channel ${channelId}: ${error.message}`);
      throw error; // Re-throw so caller knows it failed
    }
  }

  /**
   * Remove member from family channel
   */
  async removeMemberFromFamilyChannel(familyId: string, userId: string): Promise<void> {
    if (!this.streamClient) {
      this.logger.warn('Stream Chat not configured');
      return;
    }

    const channelId = `family-${familyId}`;

    try {
      // Query the channel first to ensure it exists
      const existingChannels = await this.streamClient.queryChannels({
        id: channelId,
        type: 'messaging',
      });

      if (existingChannels.length > 0) {
        const channel = existingChannels[0];
        await channel.removeMembers([userId]);
        this.logger.log(`Removed user ${userId} from family channel ${channelId}`);
      } else {
        this.logger.warn(`Family channel ${channelId} doesn't exist, nothing to remove from`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to remove user from channel: ${error.message}`);
    }
  }

  /**
   * Create care topic channel
   * For specific discussions (medications, appointments, etc.)
   */
  async createCareTopicChannel(
    familyId: string,
    topic: string,
    topicName: string,
    memberIds: string[],
    createdBy: string
  ): Promise<Channel> {
    if (!this.streamClient) {
      throw new Error('Stream Chat not configured');
    }

    // Sync members first
    await this.syncFamilyMembers(familyId);

    const channelId = `${familyId}-${topic}`;

    const channel = this.streamClient.channel('messaging', channelId, {
      name: topicName,
      image: '/icons/care-topic.png',
      created_by_id: createdBy,
      members: memberIds,
      family_id: familyId,
      topic,
    } as any);

    await channel.create();

    this.logger.log(`Created care topic channel: ${channelId}`);

    return channel;
  }

  /**
   * Send system message to family channel
   * Used for activity notifications (medication logged, appointment added, etc.)
   */
  async sendSystemMessage(
    familyId: string,
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    if (!this.streamClient) {
      return; // Silently fail if not configured
    }

    try {
      await this.ensureSystemUser();

      const channelId = `family-${familyId}`;
      const channel = this.streamClient.channel('messaging', channelId);

      await channel.sendMessage({
        text: message,
        user_id: 'system',
        type: 'system',
        ...data,
      });

      this.logger.debug(`Sent system message to family ${familyId}`);
    } catch (error: any) {
      this.logger.error(`Failed to send system message: ${error.message}`);
    }
  }

  /**
   * Delete channel (when family is deleted)
   */
  async deleteChannel(channelId: string): Promise<void> {
    if (!this.streamClient) {
      return;
    }

    try {
      const channel = this.streamClient.channel('messaging', channelId);
      await channel.delete();

      this.logger.log(`Deleted channel: ${channelId}`);
    } catch (error: any) {
      this.logger.error(`Failed to delete channel ${channelId}: ${error.message}`);
    }
  }

  /**
   * Delete family channel
   */
  async deleteFamilyChannel(familyId: string): Promise<void> {
    await this.deleteChannel(`family-${familyId}`);
  }

  /**
   * Get or create channel
   * Ensures channel exists before returning
   */
  async getOrCreateChannel(
    channelType: string,
    channelId: string,
    channelData?: Record<string, any>
  ): Promise<Channel> {
    if (!this.streamClient) {
      throw new Error('Stream Chat not configured');
    }

    const channel = this.streamClient.channel(channelType, channelId, channelData);

    await channel.watch();

    return channel;
  }

  /**
   * Query channels for a user
   */
  async getUserChannels(userId: string): Promise<Channel[]> {
    if (!this.streamClient) {
      throw new Error('Stream Chat not configured');
    }

    const channels = await this.streamClient.queryChannels({
      members: { $in: [userId] },
    });

    return channels;
  }
}
