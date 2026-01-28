'use client';

import dynamic from 'next/dynamic';
import { useFamilySpace } from '@/contexts/family-space-context';
import { ContextSelector } from '@/components/layout/context-selector';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MessageCircle, Users, AlertCircle, RefreshCw } from 'lucide-react';

// Lazy load heavy chat component (includes stream-chat-react ~300KB)
const FamilyChat = dynamic(
  () => import('@/components/chat/family-chat').then((mod) => mod.FamilyChat),
  {
    loading: () => (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3 animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
);

export default function ChatPage() {
  const { 
    families, 
    selectedFamilyId, 
    selectedFamily,
    selectedCareRecipient,
    currentRole,
    isLoading,
    refreshFamilies,
  } = useFamilySpace();

  if (isLoading) {
    return (
      <div className="min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md px-4 sm:px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl text-foreground">Family Chat</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Connect with your family members in real-time</p>
            </div>
          </div>
        </header>
        <div className="px-4 sm:px-6 py-6">
          <Card className="h-[calc(100vh-200px)] flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3 animate-pulse" />
              <p className="text-sm text-muted-foreground">Loading chat...</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (families.length === 0) {
    return (
      <div className="min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md px-4 sm:px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl text-foreground">Family Chat</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Connect with your family members in real-time</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => refreshFamilies()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </header>
        <div className="px-4 sm:px-6 py-6">
          <Card className="h-[calc(100vh-200px)] flex items-center justify-center">
            <div className="text-center max-w-md">
              <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No Families Yet
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                You need to be part of a family to use the chat feature. Create or join a family to start messaging!
              </p>
              <Button onClick={() => (window.location.href = '/family')}>
                <Users className="w-4 h-4 mr-2" />
                Go to Family Settings
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header with Context Selector - same as other pages */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md px-4 sm:px-6 py-4 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-2xl sm:text-3xl text-foreground">Family Chat</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {selectedFamily
                ? `Chatting in ${selectedFamily.name}${selectedCareRecipient ? ` • ${selectedCareRecipient.preferredName || selectedCareRecipient.fullName}` : ''}`
                : 'Connect with your family members in real-time'}
            </p>
          </div>
          
          {/* Context Selector - Family Space & Care Recipient */}
          <div className="flex items-center gap-3">
            <ContextSelector />
          </div>
        </div>
      </header>

      <div className="px-4 sm:px-6 py-6">
        <div className="space-y-4">
          {/* Chat Container */}
          {selectedFamilyId ? (
            <div className="h-[calc(100vh-240px)] min-h-[500px]">
              <Card className="h-full overflow-hidden">
                <FamilyChat familyId={selectedFamilyId} />
              </Card>
            </div>
          ) : (
            <Card className="h-[calc(100vh-240px)] flex items-center justify-center">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Select a family to start chatting</p>
              </div>
            </Card>
          )}

          {/* Chat Info */}
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground mb-1">Real-time Family Communication</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Share updates instantly with all family members</li>
                  <li>• Attach photos and documents to messages</li>
                  <li>• React to messages with emojis</li>
                  <li>• See when others are typing</li>
                  <li>• Get notifications for new messages</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
