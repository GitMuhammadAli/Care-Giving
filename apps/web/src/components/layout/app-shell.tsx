'use client';

import { cn } from '@/lib/utils';
import { DashboardHeader } from './dashboard-header';
import { MobileNav } from './mobile-nav';

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
      {/* Header */}
      <DashboardHeader currentUser={currentUser} careRecipient={careRecipient} />

      {/* Main Content */}
      <main
        className={cn(
          'min-h-screen',
          'pt-16', // Account for fixed header
          'pb-20 sm:pb-4' // Account for mobile nav
        )}
      >
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
