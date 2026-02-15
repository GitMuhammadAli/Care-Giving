'use client';

import { useEffect, useState, ReactNode } from 'react';
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

  // Show loading while auth is being initialized OR while unauthenticated (redirecting)
  // This prevents any flicker - unauthenticated users only see loading, never the protected content
  if (!isInitialized || isLoading || !isAuthenticated || !user) {
    return loadingComponent || <AuthLoadingSpinner />;
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
 * Branded loading spinner for auth check with cold-start awareness.
 */
function AuthLoadingSpinner() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-5 max-w-xs text-center px-4">
        {/* Branded logo */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div className="absolute -inset-1.5 rounded-2xl border-2 border-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
        </div>

        <div>
          <p className="text-lg font-semibold text-foreground">CareCircle</p>
          <p className="text-sm text-muted-foreground mt-1">
            {elapsed < 5
              ? 'Preparing your dashboard...'
              : elapsed < 15
              ? 'Connecting to server...'
              : 'Server is waking up — free tier may take a moment...'}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all ease-out"
            style={{
              width: `${Math.min(95, elapsed * 4)}%`,
              transitionDuration: '1s',
            }}
          />
        </div>

        {elapsed >= 10 && (
          <p className="text-[11px] text-muted-foreground/70 animate-in fade-in">
            Our free-tier server spins down after inactivity.
            <br />First load may take up to 30 seconds.
          </p>
        )}
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

