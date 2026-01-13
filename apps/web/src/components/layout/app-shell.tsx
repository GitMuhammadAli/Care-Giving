'use client';

import { cn } from '@/lib/utils';
import { MobileNav } from './mobile-nav';
import { Sidebar } from './sidebar';
import { EmergencyButton } from '@/components/care/emergency-button';

interface AppShellProps {
  children: React.ReactNode;
  currentUser?: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
  careRecipient?: {
    id: string;
    name: string;
    preferredName?: string;
    photoUrl?: string;
  };
}

export function AppShell({ children, currentUser, careRecipient }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar currentUser={currentUser} careRecipient={careRecipient} />

      {/* Main Content */}
      <main
        className={cn(
          'min-h-screen',
          'pb-20 sm:pb-0', // Account for mobile nav
          'sm:ml-[260px]' // Account for sidebar
        )}
      >
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav />

      {/* Floating Emergency Button (Mobile) */}
      <EmergencyButton careRecipientId={careRecipient?.id} />
    </div>
  );
}
