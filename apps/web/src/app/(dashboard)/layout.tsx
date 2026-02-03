'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { Footer } from '@/components/layout/footer';
import { RealtimeProvider } from '@/components/providers/realtime-provider';
import { NotificationProvider } from '@/components/providers/notification-provider';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { FamilySpaceProvider, useFamilySpace } from '@/contexts/family-space-context';
import { useAuthContext } from '@/components/providers/auth-provider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <AdminRedirectGuard>
        <FamilySpaceProvider>
          <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </FamilySpaceProvider>
      </AdminRedirectGuard>
    </ProtectedRoute>
  );
}

/**
 * Redirects admin users to the admin dashboard
 * Admin users should use /admin, not /dashboard
 */
function AdminRedirectGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isInitialized } = useAuthContext();

  useEffect(() => {
    if (isInitialized && user) {
      // Redirect admins to admin dashboard
      if (user.systemRole === 'ADMIN' || user.systemRole === 'SUPER_ADMIN') {
        router.replace('/admin/overview');
      }
    }
  }, [isInitialized, user, router]);

  // If admin, show loading while redirecting
  if (isInitialized && user && (user.systemRole === 'ADMIN' || user.systemRole === 'SUPER_ADMIN')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return <>{children}</>;
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
