'use client';

import { useEffect } from 'react';

export default function AuthFlexibleError({
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
          Something went wrong
        </h2>
        <p className="text-muted-foreground">
          An error occurred. Please try again.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
          <a
            href="/"
            className="px-6 py-2.5 border border-border text-foreground rounded-lg font-medium hover:bg-muted transition-colors inline-block"
          >
            Go to homepage
          </a>
        </div>
      </div>
    </div>
  );
}
