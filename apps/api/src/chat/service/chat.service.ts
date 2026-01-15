import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StreamChat, Channel } from 'stream-chat';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private streamClient: StreamChat;

  constructor(private readonly configService: ConfigService) {
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

    const channelId = `family-${familyId}`;

    const channel = this.streamClient.channel('messaging', channelId, {
      name: `${familyName} Chat`,
      image: '/icons/family-chat.png',
      created_by_id: createdBy,
      members: memberIds,
      family_id: familyId,
    } as any);

    await channel.create();

    this.logger.log(`Created family channel: ${channelId} with ${memberIds.length} members`);

    return channel;
  }

  /**
   * Add member to family channel
   */
  async addMemberToFamilyChannel(familyId: string, userId: string): Promise<void> {
    if (!this.streamClient) {
      throw new Error('Stream Chat not configured');
    }

    const channelId = `family-${familyId}`;
    const channel = this.streamClient.channel('messaging', channelId);

    await channel.addMembers([userId]);

    this.logger.log(`Added user ${userId} to family channel ${channelId}`);
  }

  /**
   * Remove member from family channel
   */
  async removeMemberFromFamilyChannel(familyId: string, userId: string): Promise<void> {
    if (!this.streamClient) {
      throw new Error('Stream Chat not configured');
    }

    const channelId = `family-${familyId}`;
    const channel = this.streamClient.channel('messaging', channelId);

    await channel.removeMembers([userId]);

    this.logger.log(`Removed user ${userId} from family channel ${channelId}`);
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
      const channelId = `family-${familyId}`;
      const channel = this.streamClient.channel('messaging', channelId);

      await channel.sendMessage({
        text: message,
        user_id: 'system',
        type: 'system',
        ...data,
      });

      this.logger.debug(`Sent system message to family ${familyId}`);
    } catch (error) {
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
    } catch (error) {
      this.logger.error(`Failed to delete channel ${channelId}: ${error.message}`);
    }
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
