'use client';

import { useEffect } from 'react';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[CareCircle Auth] Error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="max-w-md space-y-4">
        <h2 className="text-xl font-editorial font-bold text-foreground">
          Authentication Error
        </h2>
        <p className="text-muted-foreground">
          Something went wrong with authentication. Please try again.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
          <a
            href="/login"
            className="px-6 py-2.5 border border-border text-foreground rounded-lg font-medium hover:bg-muted transition-colors inline-block"
          >
            Back to login
          </a>
        </div>
      </div>
    </div>
  );
}
