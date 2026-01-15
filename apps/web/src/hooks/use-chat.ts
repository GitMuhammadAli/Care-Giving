'use client';

import { useEffect, useState, useCallback } from 'react';
import { StreamChat, Channel } from 'stream-chat';
import { useAuth } from './use-auth';
import { api } from '@/lib/api/client';

interface UseChatOptions {
  familyId?: string;
  autoConnect?: boolean;
}

export function useChat(options: UseChatOptions = {}) {
  const { user, isAuthenticated } = useAuth();
  const [client, setClient] = useState<StreamChat | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Initialize Stream Chat client
  useEffect(() => {
    if (!isAuthenticated || !user || !options.autoConnect) {
      return;
    }

    let isCancelled = false;

    const initChat = async () => {
      try {
        setIsConnecting(true);
        setError(null);

        // Get Stream API key from environment
        const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
        if (!apiKey) {
          throw new Error('Stream API key not configured');
        }

        // Get user token from backend
        const { token } = await api.get<{ token: string }>('/chat/token');

        // Create and connect client
        const chatClient = StreamChat.getInstance(apiKey);

        if (!isCancelled) {
          await chatClient.connectUser(
            {
              id: user.id,
              name: user.fullName,
              image: user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user.fullName}`,
            },
            token
          );

          setClient(chatClient);
          setIsConnected(true);
          console.log('[Chat] Connected to Stream Chat');
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('[Chat] Failed to connect:', err);
          setError(err as Error);
        }
      } finally {
        if (!isCancelled) {
          setIsConnecting(false);
        }
      }
    };

    initChat();

    return () => {
      isCancelled = true;
      if (client) {
        client.disconnectUser().then(() => {
          console.log('[Chat] Disconnected from Stream Chat');
        });
      }
    };
  }, [isAuthenticated, user, options.autoConnect]);

  // Get family channel
  const getFamilyChannel = useCallback(
    async (familyId: string, familyName: string): Promise<Channel | null> => {
      if (!client) {
        console.warn('[Chat] Client not initialized');
        return null;
      }

      try {
        const channel = client.channel('messaging', `family-${familyId}`, {
          name: `${familyName} Chat`,
          image: '/icons/family-chat.png',
        } as any);

        await channel.watch();
        return channel;
      } catch (err) {
        console.error('[Chat] Failed to get family channel:', err);
        return null;
      }
    },
    [client]
  );

  // Get direct message channel
  const getDirectMessageChannel = useCallback(
    async (otherUserId: string): Promise<Channel | null> => {
      if (!client || !user) {
        console.warn('[Chat] Client not initialized or user not found');
        return null;
      }

      try {
        const members = [user.id, otherUserId].sort();

        const channel = client.channel('messaging', {
          members,
        });

        await channel.watch();
        return channel;
      } catch (err) {
        console.error('[Chat] Failed to get DM channel:', err);
        return null;
      }
    },
    [client, user]
  );

  // Get unread count
  const getUnreadCount = useCallback(async (): Promise<number> => {
    if (!client) return 0;

    try {
      const channels = await client.queryChannels({
        members: { $in: [client.userID!] },
      });

      return channels.reduce((total, channel) => {
        return total + (channel.countUnread() || 0);
      }, 0);
    } catch (err) {
      console.error('[Chat] Failed to get unread count:', err);
      return 0;
    }
  }, [client]);

  // Mark all as read
  const markAllAsRead = useCallback(async (): Promise<void> => {
    if (!client) return;

    try {
      const channels = await client.queryChannels({
        members: { $in: [client.userID!] },
      });

      await Promise.all(channels.map((channel) => channel.markRead()));
    } catch (err) {
      console.error('[Chat] Failed to mark all as read:', err);
    }
  }, [client]);

  return {
    client,
    isConnecting,
    isConnected,
    error,
    getFamilyChannel,
    getDirectMessageChannel,
    getUnreadCount,
    markAllAsRead,
  };
}

/**
 * Hook to get a specific channel
 */
export function useChannel(channelType: string, channelId: string) {
  const { client, isConnected } = useChat({ autoConnect: true });
  const [channel, setChannel] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!client || !isConnected) {
      return;
    }

    let isCancelled = false;

    const loadChannel = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const ch = client.channel(channelType, channelId);
        await ch.watch();

        if (!isCancelled) {
          setChannel(ch);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('[Chat] Failed to load channel:', err);
          setError(err as Error);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadChannel();

    return () => {
      isCancelled = true;
    };
  }, [client, isConnected, channelType, channelId]);

  return {
    channel,
    isLoading,
    error,
  };
}
