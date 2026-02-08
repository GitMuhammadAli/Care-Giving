'use client';

import { useEffect } from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[CareCircle Admin] Error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="max-w-md space-y-4">
        <h2 className="text-xl font-editorial font-bold text-foreground">
          Admin Panel Error
        </h2>
        <p className="text-muted-foreground">
          An error occurred in the admin panel. Please try again.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
          <a
            href="/admin"
            className="px-6 py-2.5 border border-border text-foreground rounded-lg font-medium hover:bg-muted transition-colors inline-block"
          >
            Back to admin dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
