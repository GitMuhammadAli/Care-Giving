'use client';

import { DashboardHeader } from '@/components/layout/dashboard-header';
import { Footer } from '@/components/layout/footer';
import { RealtimeProvider } from '@/components/providers/realtime-provider';
import { NotificationProvider } from '@/components/providers/notification-provider';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuthContext } from '@/components/providers/auth-provider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </ProtectedRoute>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext();
  const familyId = user?.families?.[0]?.id;

  return (
    <NotificationProvider>
      <RealtimeProvider familyId={familyId}>
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
