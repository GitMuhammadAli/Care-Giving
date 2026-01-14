/**
 * Stream Chat Integration for CareCircle
 *
 * Setup Instructions:
 * 1. Create account at https://getstream.io/
 * 2. Get API key and secret from dashboard
 * 3. Add to .env:
 *    NEXT_PUBLIC_STREAM_API_KEY=your_api_key
 *    STREAM_API_SECRET=your_api_secret (backend only)
 *
 * Free Tier: 5 million API calls/month, unlimited channels
 */

import { StreamChat, Channel, User as StreamUser } from 'stream-chat';

const API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY || '';

let chatClient: StreamChat | null = null;

export interface ChatUser {
  id: string;
  name: string;
  image?: string;
}

/**
 * Initialize Stream Chat client
 * Call this once when user logs in
 */
export async function initializeChat(user: ChatUser, userToken: string): Promise<StreamChat> {
  if (chatClient) {
    return chatClient;
  }

  if (!API_KEY) {
    throw new Error('Stream API key not configured. Add NEXT_PUBLIC_STREAM_API_KEY to .env');
  }

  chatClient = StreamChat.getInstance(API_KEY);

  await chatClient.connectUser(
    {
      id: user.id,
      name: user.name,
      image: user.image,
    },
    userToken // Generate this token on backend using Stream secret
  );

  console.log('✅ Stream Chat connected for user:', user.name);
  return chatClient;
}

/**
 * Disconnect from Stream Chat
 * Call this when user logs out
 */
export async function disconnectChat(): Promise<void> {
  if (chatClient) {
    await chatClient.disconnectUser();
    chatClient = null;
    console.log('✅ Stream Chat disconnected');
  }
}

/**
 * Get or create family chat channel
 * All family members can message each other
 */
export async function getFamilyChannel(familyId: string, familyName: string): Promise<Channel> {
  if (!chatClient) {
    throw new Error('Chat not initialized. Call initializeChat() first');
  }

  const channel = chatClient.channel('messaging', `family-${familyId}`, {
    name: `${familyName} Chat`,
    image: '/icons/family-chat.png',
  });

  await channel.watch();
  return channel;
}

/**
 * Send direct message to another family member
 */
export async function getDirectMessageChannel(
  currentUserId: string,
  otherUserId: string
): Promise<Channel> {
  if (!chatClient) {
    throw new Error('Chat not initialized. Call initializeChat() first');
  }

  // Sort user IDs to ensure consistent channel ID
  const members = [currentUserId, otherUserId].sort();

  const channel = chatClient.channel('messaging', {
    members,
  });

  await channel.watch();
  return channel;
}

/**
 * Create care-related discussion channel
 * For specific topics like medication schedules, doctor appointments
 */
export async function getCareTopicChannel(
  familyId: string,
  topic: string,
  topicName: string
): Promise<Channel> {
  if (!chatClient) {
    throw new Error('Chat not initialized. Call initializeChat() first');
  }

  const channel = chatClient.channel('messaging', `${familyId}-${topic}`, {
    name: topicName,
    image: '/icons/care-topic.png',
  });

  await channel.watch();
  return channel;
}

/**
 * Get chat client instance
 */
export function getChatClient(): StreamChat | null {
  return chatClient;
}

/**
 * Mark all messages as read
 */
export async function markAllAsRead(): Promise<void> {
  if (!chatClient) return;

  const channels = await chatClient.queryChannels({
    members: { $in: [chatClient.userID!] },
  });

  await Promise.all(channels.map((channel) => channel.markRead()));
}

/**
 * Get unread message count
 */
export async function getUnreadCount(): Promise<number> {
  if (!chatClient) return 0;

  const channels = await chatClient.queryChannels({
    members: { $in: [chatClient.userID!] },
  });

  return channels.reduce((total, channel) => {
    return total + (channel.countUnread() || 0);
  }, 0);
}

// Backend helper (to be used in NestJS API)
// ============================================
/**
 * BACKEND ONLY: Generate Stream user token
 *
 * Usage in NestJS:
 * ```typescript
 * import { StreamChat } from 'stream-chat';
 *
 * @Injectable()
 * export class ChatService {
 *   private streamClient: StreamChat;
 *
 *   constructor(private configService: ConfigService) {
 *     this.streamClient = StreamChat.getInstance(
 *       this.configService.get('NEXT_PUBLIC_STREAM_API_KEY'),
 *       this.configService.get('STREAM_API_SECRET')
 *     );
 *   }
 *
 *   async generateUserToken(userId: string): Promise<string> {
 *     return this.streamClient.createToken(userId);
 *   }
 *
 *   async createFamilyChannel(familyId: string, memberIds: string[]) {
 *     const channel = this.streamClient.channel('messaging', `family-${familyId}`, {
 *       created_by_id: memberIds[0],
 *       members: memberIds,
 *     });
 *     await channel.create();
 *     return channel;
 *   }
 * }
 * ```
 */

/**
 * Example usage in React component:
 *
 * ```tsx
 * import { useEffect, useState } from 'react';
 * import { Channel } from 'stream-chat';
 * import { Chat, Channel as ChatChannel, ChannelHeader, MessageList, MessageInput, Thread, Window } from 'stream-chat-react';
 * import { initializeChat, getFamilyChannel, disconnectChat } from '@/lib/stream-chat';
 * import 'stream-chat-react/dist/css/v2/index.css';
 *
 * export default function FamilyChat() {
 *   const [channel, setChannel] = useState<Channel | null>(null);
 *   const [client, setClient] = useState(null);
 *
 *   useEffect(() => {
 *     async function setupChat() {
 *       // Get user token from your API
 *       const response = await fetch('/api/v1/chat/token');
 *       const { token } = await response.json();
 *
 *       // Initialize client
 *       const client = await initializeChat(
 *         { id: user.id, name: user.fullName, image: user.avatarUrl },
 *         token
 *       );
 *       setClient(client);
 *
 *       // Get family channel
 *       const familyChannel = await getFamilyChannel(familyId, familyName);
 *       setChannel(familyChannel);
 *     }
 *
 *     setupChat();
 *
 *     return () => {
 *       disconnectChat();
 *     };
 *   }, []);
 *
 *   if (!client || !channel) return <div>Loading chat...</div>;
 *
 *   return (
 *     <Chat client={client}>
 *       <ChatChannel channel={channel}>
 *         <Window>
 *           <ChannelHeader />
 *           <MessageList />
 *           <MessageInput />
 *         </Window>
 *         <Thread />
 *       </ChatChannel>
 *     </Chat>
 *   );
 * }
 * ```
 */
