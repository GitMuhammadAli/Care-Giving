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
}

export function AppShell({ children, currentUser }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <DashboardHeader currentUser={currentUser} />

      {/* Main Content */}
      <main
        className={cn(
          'h-[calc(100vh-4rem)]', // Full height minus header (64px)
          'mt-16', // Push below fixed header
          'pb-20 sm:pb-0', // Padding for mobile nav only
          'overflow-x-hidden', // Only prevent horizontal scroll - pages manage their own vertical scroll
          'w-full max-w-full' // Prevent overflow
        )}
      >
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
