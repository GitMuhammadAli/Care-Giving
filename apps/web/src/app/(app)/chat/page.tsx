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
    isLoading,
    refreshFamilies,
  } = useFamilySpace();

  if (isLoading) {
    return (
      <div className="h-full w-full flex flex-col overflow-hidden">
        <header className="flex-shrink-0 bg-background/80 backdrop-blur-md px-3 sm:px-6 py-3 sm:py-4 border-b border-border">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-xl sm:text-2xl text-foreground">Family Chat</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Connect with your family members</p>
            </div>
          </div>
        </header>
        <div className="flex-1 min-h-0 p-2 sm:p-6">
          <Card className="h-full flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3 animate-pulse" />
              <p className="text-xs sm:text-sm text-muted-foreground">Loading chat...</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (families.length === 0) {
    return (
      <div className="h-full w-full flex flex-col overflow-hidden">
        <header className="flex-shrink-0 bg-background/80 backdrop-blur-md px-3 sm:px-6 py-3 sm:py-4 border-b border-border">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <h1 className="font-serif text-xl sm:text-2xl text-foreground">Family Chat</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Connect with your family members</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => refreshFamilies()} className="flex-shrink-0">
              <RefreshCw className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </header>
        <div className="flex-1 min-h-0 p-2 sm:p-6">
          <Card className="h-full flex items-center justify-center">
            <div className="text-center max-w-md px-4">
              <MessageCircle className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                No Families Yet
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                You need to be part of a family to use chat. Create or join a family to start messaging!
              </p>
              <Button onClick={() => (window.location.href = '/family')} className="touch-target">
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
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Header with Context Selector */}
      <header className="flex-shrink-0 bg-background/80 backdrop-blur-md px-3 sm:px-6 py-2.5 sm:py-3 border-b border-border">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-lg sm:text-xl text-foreground truncate">Family Chat</h1>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
              {selectedFamily
                ? `${selectedFamily.name}${selectedCareRecipient ? ` • ${selectedCareRecipient.preferredName || selectedCareRecipient.fullName}` : ''}`
                : 'Connect with your family'}
            </p>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <ContextSelector compact />
          </div>
        </div>
      </header>

      {/* Chat Container - fills remaining space */}
      <div className="flex-1 min-h-0 overflow-hidden p-0 sm:p-4">
        {selectedFamilyId ? (
          <div className="h-full w-full sm:rounded-xl border-0 sm:border border-border bg-card overflow-hidden sm:shadow-sm">
            <FamilyChat familyId={selectedFamilyId} />
          </div>
        ) : (
          <Card className="h-full w-full flex items-center justify-center">
            <div className="text-center px-4">
              <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-xs sm:text-sm text-muted-foreground">Select a family to start chatting</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
