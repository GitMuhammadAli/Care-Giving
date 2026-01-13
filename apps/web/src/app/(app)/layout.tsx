'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { RealtimeProvider } from '@/components/providers/realtime-provider';
import { NotificationProvider } from '@/components/providers/notification-provider';
import { useAuth } from '@/hooks/use-auth';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, fetchUser } = useAuth();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Show nothing while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  // Get family ID from user's families (first one for now)
  const familyId = user.families?.[0]?.id;
  const careRecipient = user.families?.[0]?.careRecipients?.[0];

  return (
    <NotificationProvider>
      <RealtimeProvider familyId={familyId}>
        <AppShell
          currentUser={{
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl,
          }}
          careRecipient={careRecipient ? {
            id: careRecipient.id,
            name: `${careRecipient.firstName} ${careRecipient.lastName}`,
            preferredName: careRecipient.preferredName,
            photoUrl: careRecipient.photoUrl,
          } : undefined}
        >
          {children}
        </AppShell>
      </RealtimeProvider>
    </NotificationProvider>
  );
}

