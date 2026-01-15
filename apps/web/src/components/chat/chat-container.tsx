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
  LoadingIndicator,
} from 'stream-chat-react';
import { Channel as StreamChannel } from 'stream-chat';
import { useChat } from '@/hooks/use-chat';
import 'stream-chat-react/dist/css/v2/index.css';

interface ChatContainerProps {
  channelType: string;
  channelId: string;
  channelName?: string;
}

export function ChatContainer({ channelType, channelId, channelName }: ChatContainerProps) {
  const { client, isConnecting, isConnected, error } = useChat({ autoConnect: true });
  const [channel, setChannel] = useState<StreamChannel | null>(null);
  const [isLoadingChannel, setIsLoadingChannel] = useState(false);

  useEffect(() => {
    if (!client || !isConnected) {
      return;
    }

    let isCancelled = false;

    const loadChannel = async () => {
      try {
        setIsLoadingChannel(true);

        const ch = client.channel(channelType, channelId, channelName ? { name: channelName } as any : undefined);
        await ch.watch();

        if (!isCancelled) {
          setChannel(ch);
        }
      } catch (err) {
        console.error('[Chat] Failed to load channel:', err);
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

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-error mb-2">Failed to connect to chat</p>
          <p className="text-sm text-text-secondary">{error.message}</p>
        </div>
      </div>
    );
  }

  if (isConnecting || isLoadingChannel || !client || !channel) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingIndicator size={40} />
      </div>
    );
  }

  return (
    <Chat client={client} theme="str-chat__theme-light">
      <Channel channel={channel}>
        <Window>
          <ChannelHeader />
          <MessageList />
          <MessageInput />
        </Window>
        <Thread />
      </Channel>
    </Chat>
  );
}
