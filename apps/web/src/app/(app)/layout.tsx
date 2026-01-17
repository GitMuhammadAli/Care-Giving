'use client';

import { AppShell } from '@/components/layout/app-shell';
import { RealtimeProvider } from '@/components/providers/realtime-provider';
import { NotificationProvider } from '@/components/providers/notification-provider';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuthContext } from '@/components/providers/auth-provider';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <AppLayoutContent>{children}</AppLayoutContent>
    </ProtectedRoute>
  );
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext();
  
  // Get family ID from user's families (first one for now)
  const familyId = user?.families?.[0]?.id;
  const careRecipient = user?.families?.[0]?.careRecipients?.[0];

  return (
    <NotificationProvider>
      <RealtimeProvider familyId={familyId}>
        <AppShell
          currentUser={{
            name: user?.fullName || user?.email || '',
            email: user?.email || '',
            avatarUrl: user?.avatarUrl,
          }}
          careRecipient={careRecipient ? {
            id: careRecipient.id,
            name: careRecipient.fullName || '',
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
