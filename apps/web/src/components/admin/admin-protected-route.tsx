'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthContext } from '@/components/providers/auth-provider';

interface AdminProtectedRouteProps {
  children: ReactNode;
  /** Require super admin (default: false - allows ADMIN and SUPER_ADMIN) */
  superAdminOnly?: boolean;
}

/**
 * AdminProtectedRoute - Wrapper component for admin dashboard routes
 * 
 * Features:
 * - Redirects non-admin users to the regular app
 * - Shows loading state while auth is being determined
 * - Optional super admin-only access
 */
export function AdminProtectedRoute({
  children,
  superAdminOnly = false,
}: AdminProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, isInitialized } = useAuthContext();

  const isAdmin = user?.systemRole === 'ADMIN' || user?.systemRole === 'SUPER_ADMIN';
  const isSuperAdmin = user?.systemRole === 'SUPER_ADMIN';
  const hasAccess = superAdminOnly ? isSuperAdmin : isAdmin;

  useEffect(() => {
    if (isInitialized && !isLoading) {
      if (!isAuthenticated) {
        // Not logged in - redirect to admin login
        router.replace(`/admin/login?returnUrl=${encodeURIComponent(pathname)}`);
      } else if (!hasAccess) {
        // Logged in but not an admin - redirect to regular dashboard
        router.replace('/dashboard');
      }
    }
  }, [isInitialized, isLoading, isAuthenticated, hasAccess, router, pathname]);

  // Show loading while auth is being initialized
  if (!isInitialized || isLoading) {
    return <AdminLoadingSpinner />;
  }

  // Show loading while redirecting
  if (!isAuthenticated || !hasAccess) {
    return <AdminLoadingSpinner />;
  }

  return <>{children}</>;
}

function AdminLoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
        <p className="text-sm text-slate-400">Loading admin dashboard...</p>
      </div>
    </div>
  );
}

export default AdminProtectedRoute;

