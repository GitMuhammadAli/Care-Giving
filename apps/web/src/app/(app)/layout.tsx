'use client';

import { useMemo } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { RealtimeProvider } from '@/components/providers/realtime-provider';
import { NotificationProvider } from '@/components/providers/notification-provider';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuthContext } from '@/components/providers/auth-provider';
import { FamilySpaceProvider, useFamilySpace } from '@/contexts/family-space-context';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <FamilySpaceProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
      </FamilySpaceProvider>
    </ProtectedRoute>
  );
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext();
  const { selectedFamilyId } = useFamilySpace();

  // Memoize currentUser to prevent unnecessary re-renders
  const currentUser = useMemo(() => ({
    name: user?.fullName || user?.email || '',
    email: user?.email || '',
    avatarUrl: user?.avatarUrl,
  }), [user?.fullName, user?.email, user?.avatarUrl]);

  return (
    <NotificationProvider>
      <RealtimeProvider familyId={selectedFamilyId ?? undefined}>
        <AppShell currentUser={currentUser}>
          {children}
        </AppShell>
      </RealtimeProvider>
    </NotificationProvider>
  );
}
