'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { RealtimeProvider } from '@/components/providers/realtime-provider';
import { NotificationProvider } from '@/components/providers/notification-provider';
import { useAuth } from '@/hooks/use-auth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, fetchUser } = useAuth();

  // Fetch user on mount
  useEffect(() => {
    if (!user && !isLoading) {
      fetchUser();
    }
  }, [user, isLoading, fetchUser]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const familyId = user.families?.[0]?.id;

  return (
    <NotificationProvider>
      <RealtimeProvider familyId={familyId}>
        <div className="min-h-screen bg-background flex flex-col texture-paper">
          <Header />
          <main className="flex-1 pt-24 pb-12 md:pb-20">
            {children}
          </main>
          <Footer />
        </div>
      </RealtimeProvider>
    </NotificationProvider>
  );
}
