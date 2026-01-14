'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthContext } from '@/components/providers/auth-provider';

interface ProtectedRouteProps {
  children: ReactNode;
  /** Required roles for this route (if any) */
  requiredRoles?: Array<'ADMIN' | 'CAREGIVER' | 'VIEWER'>;
  /** Redirect path when not authenticated (default: /login) */
  redirectTo?: string;
  /** Loading component to show while checking auth */
  loadingComponent?: ReactNode;
  /** Fallback component when access is denied */
  accessDeniedComponent?: ReactNode;
}

/**
 * ProtectedRoute - Wrapper component for authenticated routes
 * 
 * Features:
 * - Redirects to login if not authenticated
 * - Shows loading state while auth is being determined
 * - Optional role-based access control
 * - Customizable redirect and fallback components
 */
export function ProtectedRoute({
  children,
  requiredRoles,
  redirectTo = '/login',
  loadingComponent,
  accessDeniedComponent,
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, isInitialized, hasAnyRole } = useAuthContext();

  // Redirect to login if not authenticated (after auth is initialized)
  useEffect(() => {
    if (isInitialized && !isLoading && !isAuthenticated) {
      // Store the intended path for redirect after login
      const returnUrl = encodeURIComponent(pathname);
      router.replace(`${redirectTo}?returnUrl=${returnUrl}`);
    }
  }, [isInitialized, isLoading, isAuthenticated, router, pathname, redirectTo]);

  // Show loading while auth is being initialized
  if (!isInitialized || isLoading) {
    return loadingComponent || <AuthLoadingSpinner />;
  }

  // Not authenticated - show nothing while redirecting
  if (!isAuthenticated || !user) {
    return null;
  }

  // Check role-based access if roles are specified
  if (requiredRoles && requiredRoles.length > 0) {
    const familyId = user.families?.[0]?.id;
    
    if (!familyId || !hasAnyRole(familyId, requiredRoles)) {
      return accessDeniedComponent || <AccessDenied requiredRoles={requiredRoles} />;
    }
  }

  return <>{children}</>;
}

/**
 * Default loading spinner for auth check
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

/**
 * Default access denied component
 */
function AccessDenied({ requiredRoles }: { requiredRoles: string[] }) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md text-center p-8">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-destructive"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-serif text-foreground mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">
          You don't have permission to access this page.
          {requiredRoles.length > 0 && (
            <span className="block mt-2 text-sm">
              Required role: {requiredRoles.join(' or ')}
            </span>
          )}
        </p>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}

export default ProtectedRoute;

