'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthContext } from '@/components/providers/auth-provider';

interface PublicRouteProps {
  children: ReactNode;
  /** Where to redirect authenticated users (default: /dashboard) */
  redirectTo?: string;
  /** Loading component to show while checking auth */
  loadingComponent?: ReactNode;
  /**
   * Allow authenticated users to access this route without redirect
   * Useful for routes like password reset that should work regardless of auth state
   */
  allowAuthenticated?: boolean;
}

/**
 * PublicRoute - Wrapper component for public/auth routes
 *
 * Features:
 * - Redirects to dashboard if already authenticated (unless allowAuthenticated is true)
 * - Supports returnUrl parameter for redirect after login
 * - Shows loading state while auth is being determined
 */
export function PublicRoute({
  children,
  redirectTo = '/dashboard',
  loadingComponent,
  allowAuthenticated = false,
}: PublicRouteProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, isInitialized } = useAuthContext();

  // Get return URL from query params (for post-login redirect)
  const returnUrl = searchParams.get('returnUrl');

  // Redirect to dashboard/returnUrl if already authenticated (unless allowAuthenticated)
  useEffect(() => {
    if (isInitialized && !isLoading && isAuthenticated && !allowAuthenticated) {
      // Use returnUrl if provided, otherwise use default redirectTo
      const destination = returnUrl ? decodeURIComponent(returnUrl) : redirectTo;
      router.replace(destination);
    }
  }, [isInitialized, isLoading, isAuthenticated, router, returnUrl, redirectTo, allowAuthenticated]);

  // If allowAuthenticated, only wait for initialization and loading
  if (allowAuthenticated) {
    if (!isInitialized || isLoading) {
      return loadingComponent || <AuthLoadingSpinner />;
    }
    return <>{children}</>;
  }

  // Show loading while auth is being initialized OR while authenticated (redirecting)
  // This prevents any flicker - authenticated users only see loading, never the page content
  if (!isInitialized || isLoading || isAuthenticated) {
    return loadingComponent || <AuthLoadingSpinner />;
  }

  // Only render children for unauthenticated users
  return <>{children}</>;
}

/**
 * Default loading spinner
 */
function AuthLoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export default PublicRoute;

