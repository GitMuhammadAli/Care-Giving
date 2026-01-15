'use client';

import { useState } from 'react';
import { FamilyChat } from '@/components/chat';
import { PageHeader } from '@/components/layout/page-header';
import { useFamilies } from '@/hooks/use-family';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MessageCircle, Users, AlertCircle } from 'lucide-react';

export default function ChatPage() {
  const { data: families = [], isLoading } = useFamilies();
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(
    families.length > 0 ? families[0].id : null
  );

  // Auto-select first family when families load
  useState(() => {
    if (families.length > 0 && !selectedFamilyId) {
      setSelectedFamilyId(families[0].id);
    }
  });

  if (isLoading) {
    return (
      <div className="pb-6">
        <PageHeader
          title="Family Chat"
          subtitle="Connect with your family members in real-time"
        />
        <div className="px-4 sm:px-6 py-6">
          <Card className="h-[calc(100vh-240px)] flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 text-text-tertiary mx-auto mb-3 animate-pulse" />
              <p className="text-sm text-text-secondary">Loading chat...</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (families.length === 0) {
    return (
      <div className="pb-6">
        <PageHeader
          title="Family Chat"
          subtitle="Connect with your family members in real-time"
        />
        <div className="px-4 sm:px-6 py-6">
          <Card className="h-[calc(100vh-240px)] flex items-center justify-center">
            <div className="text-center max-w-md">
              <MessageCircle className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                No Families Yet
              </h3>
              <p className="text-sm text-text-secondary mb-4">
                You need to be part of a family to use the chat feature. Create or join a family to start messaging!
              </p>
              <Button variant="primary" onClick={() => (window.location.href = '/family')}>
                <Users className="w-4 h-4 mr-2" />
                Go to Family
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const selectedFamily = families.find((f) => f.id === selectedFamilyId);

  return (
    <div className="pb-6">
      <PageHeader
        title="Family Chat"
        subtitle={
          selectedFamily
            ? `Chatting with ${selectedFamily.name}`
            : 'Connect with your family members in real-time'
        }
      />

      <div className="px-4 sm:px-6 py-6">
        <div className="space-y-4">
          {/* Family Selector (if multiple families) */}
          {families.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {families.map((family) => (
                <Button
                  key={family.id}
                  variant={selectedFamilyId === family.id ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setSelectedFamilyId(family.id)}
                  className="whitespace-nowrap"
                >
                  <Users className="w-4 h-4 mr-2" />
                  {family.name}
                </Button>
              ))}
            </div>
          )}

          {/* Chat Container */}
          {selectedFamilyId ? (
            <div className="h-[calc(100vh-280px)] min-h-[500px]">
              <Card className="h-full overflow-hidden">
                <FamilyChat familyId={selectedFamilyId} />
              </Card>
            </div>
          ) : (
            <Card className="h-[calc(100vh-280px)] flex items-center justify-center">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
                <p className="text-sm text-text-secondary">Select a family to start chatting</p>
              </div>
            </Card>
          )}

          {/* Chat Info */}
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-accent-primary-light flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-accent-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-text-primary mb-1">Real-time Family Communication</h3>
                <ul className="text-sm text-text-secondary space-y-1">
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
