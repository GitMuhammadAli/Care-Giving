'use client';

import { useEffect, useState } from 'react';
import { ChatContainer } from './chat-container';
import { useFamily } from '@/hooks/use-family';
import { Card } from '@/components/ui/card';
import { MessageCircle, AlertCircle } from 'lucide-react';

interface FamilyChatProps {
  familyId: string;
}

export function FamilyChat({ familyId }: FamilyChatProps) {
  const { data: family, isLoading, error } = useFamily(familyId);

  if (isLoading) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 text-text-tertiary mx-auto mb-3 animate-pulse" />
          <p className="text-sm text-text-secondary">Loading chat...</p>
        </div>
      </Card>
    );
  }

  if (error || !family) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-error mx-auto mb-3" />
          <p className="text-lg font-semibold text-error mb-2">Unable to load family chat</p>
          <p className="text-sm text-text-secondary">Please try again later</p>
        </div>
      </Card>
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
