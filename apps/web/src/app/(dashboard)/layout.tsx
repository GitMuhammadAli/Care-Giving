'use client';

import { DashboardHeader } from '@/components/layout/dashboard-header';
import { Footer } from '@/components/layout/footer';
import { RealtimeProvider } from '@/components/providers/realtime-provider';
import { NotificationProvider } from '@/components/providers/notification-provider';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { FamilySpaceProvider, useFamilySpace } from '@/contexts/family-space-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <FamilySpaceProvider>
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </FamilySpaceProvider>
    </ProtectedRoute>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { selectedFamilyId } = useFamilySpace();

  return (
    <NotificationProvider>
      <RealtimeProvider familyId={selectedFamilyId ?? undefined}>
        <div className="min-h-screen bg-background flex flex-col texture-paper">
          <DashboardHeader />
          <main className="flex-1 pt-24 pb-12 md:pb-20">
            {children}
          </main>
          <Footer />
        </div>
      </RealtimeProvider>
    </NotificationProvider>
  );
}
