'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { StreamChat, Channel } from 'stream-chat';
import { useAuth } from './use-auth';
import { api } from '@/lib/api/client';

interface UseChatOptions {
  familyId?: string;
  autoConnect?: boolean;
}

interface ChatTokenResponse {
  token: string | null;
  userId: string;
  userName?: string;
  userImage?: string;
  configured: boolean;
  message?: string;
}

interface ChatInitResponse {
  success: boolean;
  configured: boolean;
  channelId?: string;
  channelType?: string;
  familyName?: string;
  message?: string;
}

export function useChat(options: UseChatOptions = {}) {
  const { user, isAuthenticated } = useAuth();
  const [client, setClient] = useState<StreamChat | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isConfigured, setIsConfigured] = useState(true);
  // Use ref to track the client for cleanup to avoid stale closure
  const clientRef = useRef<StreamChat | null>(null);

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
          setIsConfigured(false);
          console.warn('[Chat] Stream API key not configured');
          return;
        }

        // Get user token from backend (also syncs user to Stream Chat)
        const tokenResponse = await api.get<ChatTokenResponse>('/chat/token');

        // Check if Stream Chat is configured on the backend
        if (!tokenResponse.configured || !tokenResponse.token) {
          setIsConfigured(false);
          console.warn('[Chat] Stream Chat is not configured on the server');
          return;
        }

        // Create and connect client
        const chatClient = StreamChat.getInstance(apiKey);

        if (!isCancelled) {
          await chatClient.connectUser(
            {
              id: user.id,
              name: tokenResponse.userName || user.fullName,
              image: tokenResponse.userImage || user.avatarUrl ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.fullName)}`,
            },
            tokenResponse.token
          );

          clientRef.current = chatClient;
          setClient(chatClient);
          setIsConnected(true);
          console.log('[Chat] Connected to Stream Chat');
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('[Chat] Failed to connect:', err);
          // Check if it's a configuration error (500 = internal error, 503 = service unavailable)
          if (
            err?.message?.includes('not configured') ||
            err?.status === 500 ||
            err?.status === 503 ||
            err?.statusCode === 503
          ) {
            setIsConfigured(false);
            // Don't set error for expected "not configured" state
            console.warn('[Chat] Stream Chat is not configured on the server');
          } else {
            setError(err as Error);
          }
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
      // Use ref to get the latest client instance (avoids stale closure)
      const currentClient = clientRef.current;
      if (currentClient) {
        currentClient.disconnectUser().then(() => {
          console.log('[Chat] Disconnected from Stream Chat');
        });
        clientRef.current = null;
      }
    };
  }, [isAuthenticated, user, options.autoConnect]);

  // Initialize family chat channel (ensures users are synced and channel exists)
  const initializeFamilyChat = useCallback(
    async (familyId: string): Promise<ChatInitResponse> => {
      try {
        const response = await api.get<ChatInitResponse>(`/chat/family/${familyId}/init`);
        return response;
      } catch (err: any) {
        console.error('[Chat] Failed to initialize family chat:', err);
        return {
          success: false,
          configured: false,
          message: err.message || 'Failed to initialize chat',
        };
      }
    },
    []
  );

  // Get family channel (calls init first to ensure users are synced)
  const getFamilyChannel = useCallback(
    async (familyId: string, familyName: string): Promise<Channel | null> => {
      if (!client) {
        console.warn('[Chat] Client not initialized');
        return null;
      }

      try {
        // First, initialize the family chat on the backend
        // This ensures all users are synced to Stream Chat
        const initResult = await initializeFamilyChat(familyId);

        if (!initResult.success || !initResult.configured) {
          console.warn('[Chat] Family chat not configured:', initResult.message);
          return null;
        }

        // Now get the channel
        const channel = client.channel('messaging', `family-${familyId}`, {
          name: `${familyName} Chat`,
          image: '/icons/family-chat.png',
        } as any);

        await channel.watch();
        console.log(`[Chat] Connected to family channel: family-${familyId}`);
        return channel;
      } catch (err) {
        console.error('[Chat] Failed to get family channel:', err);
        return null;
      }
    },
    [client, initializeFamilyChat]
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
    isConfigured,
    error,
    initializeFamilyChat,
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

/**
 * Hook for family chat that handles initialization
 */
export function useFamilyChat(familyId: string | undefined, familyName: string) {
  const { client, isConnected, isConfigured, initializeFamilyChat, getFamilyChannel } = useChat({ autoConnect: true });
  const [channel, setChannel] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!client || !isConnected || !familyId) {
      return;
    }

    let isCancelled = false;

    const loadFamilyChannel = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const ch = await getFamilyChannel(familyId, familyName);

        if (!isCancelled) {
          setChannel(ch);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('[Chat] Failed to load family channel:', err);
          setError(err as Error);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadFamilyChannel();

    return () => {
      isCancelled = true;
    };
  }, [client, isConnected, familyId, familyName, getFamilyChannel]);

  return {
    client,
    channel,
    isLoading,
    isConfigured,
    error,
  };
}
