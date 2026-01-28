'use client';

import { useEffect, useState } from 'react';
import { ChatContainer } from './chat-container';
import { useFamily } from '@/hooks/use-family';
import { useFamilyChat } from '@/hooks/use-chat';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, AlertCircle, Settings, Users, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface FamilyChatProps {
  familyId: string;
}

export function FamilyChat({ familyId }: FamilyChatProps) {
  const { data: family, isLoading: familyLoading, error: familyError } = useFamily(familyId);
  const { isConfigured, isLoading: chatLoading, error: chatError } = useFamilyChat(
    familyId, 
    family?.name || 'Family'
  );

  // Show loading state
  if (familyLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-card">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3 animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading family...</p>
        </div>
      </div>
    );
  }

  // Show error if family fetch failed
  if (familyError || !family) {
    return (
      <div className="h-full flex items-center justify-center bg-card">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
          <p className="text-lg font-semibold text-destructive mb-2">Unable to load family</p>
          <p className="text-sm text-muted-foreground">
            Please check your connection and try again.
          </p>
        </div>
      </div>
    );
  }

  // Show "not configured" state if Stream Chat is not set up
  if (!isConfigured) {
    return (
      <div className="h-full flex items-center justify-center bg-card">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
            <Settings className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Chat Not Configured</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Real-time chat requires Stream Chat to be configured. Please contact your administrator or check the environment configuration.
          </p>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Required: <code className="bg-muted px-1 py-0.5 rounded">NEXT_PUBLIC_STREAM_API_KEY</code>
            </p>
            <p className="text-xs text-muted-foreground">
              and backend Stream Chat credentials
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-2">
            <Link href="/family" className="w-full">
              <Button variant="outline" className="w-full">
                <Users className="w-4 h-4 mr-2" />
                View Family Members
              </Button>
            </Link>
            <a 
              href="https://getstream.io/chat/docs/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1 justify-center"
            >
              Learn about Stream Chat
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Show chat error
  if (chatError) {
    return (
      <div className="h-full flex items-center justify-center bg-card">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
          <p className="text-lg font-semibold text-destructive mb-2">Failed to connect to chat</p>
          <p className="text-sm text-muted-foreground mb-4">
            {chatError.message || 'An error occurred while connecting to the chat service.'}
          </p>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <ChatContainer
        channelType="messaging"
        channelId={`family-${familyId}`}
        channelName={`${family.name} Chat`}
      />
    </div>
  );
}
