'use client';

import { useEffect, useState } from 'react';
import {
  Chat,
  Channel,
  ChannelHeader,
  MessageList,
  MessageInput,
  Thread,
  Window,
} from 'stream-chat-react';
import { Channel as StreamChannel } from 'stream-chat';
import { useChat } from '@/hooks/use-chat';
import { MessageCircle } from 'lucide-react';
import 'stream-chat-react/dist/css/v2/index.css';
import './chat-styles.css';

interface ChatContainerProps {
  channelType: string;
  channelId: string;
  channelName?: string;
}

export function ChatContainer({ channelType, channelId, channelName }: ChatContainerProps) {
  const { client, isConnecting, isConnected, error } = useChat({ autoConnect: true });
  const [channel, setChannel] = useState<StreamChannel | null>(null);
  const [isLoadingChannel, setIsLoadingChannel] = useState(false);
  const [channelError, setChannelError] = useState<string | null>(null);

  useEffect(() => {
    if (!client || !isConnected) {
      return;
    }

    let isCancelled = false;

    const loadChannel = async () => {
      try {
        setIsLoadingChannel(true);
        setChannelError(null);

        const ch = client.channel(channelType, channelId, channelName ? { name: channelName } as any : undefined);
        await ch.watch();

        if (!isCancelled) {
          setChannel(ch);
        }
      } catch (err: any) {
        console.error('[Chat] Failed to load channel:', err);
        if (!isCancelled) {
          setChannelError(err.message || 'Failed to load channel');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingChannel(false);
        }
      }
    };

    loadChannel();

    return () => {
      isCancelled = true;
    };
  }, [client, isConnected, channelType, channelId, channelName]);

  // Error state
  if (error || channelError) {
    return (
      <div className="h-full flex items-center justify-center bg-card">
        <div className="text-center p-6">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-destructive" />
          </div>
          <p className="font-semibold text-destructive mb-2">Connection Error</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            {error?.message || channelError || 'Failed to connect to chat'}
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isConnecting || isLoadingChannel || !client || !channel) {
    return (
      <div className="h-full flex items-center justify-center bg-card">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            {isConnecting ? 'Connecting...' : 'Loading chat...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <Chat client={client} theme="str-chat__theme-light">
        <Channel channel={channel}>
          <Window>
            <ChannelHeader />
            <MessageList />
            <MessageInput focus />
          </Window>
          <Thread />
        </Channel>
      </Chat>
    </div>
  );
}
