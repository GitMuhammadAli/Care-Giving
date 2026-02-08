export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side instrumentation
    console.log('[CareCircle] Server instrumentation initialized');

    // Log environment info in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('[CareCircle] API URL:', process.env.NEXT_PUBLIC_API_URL);
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime instrumentation
    console.log('[CareCircle] Edge runtime initialized');
  }
}

// Note: onRequestError is available in Next.js 15+
// For Next.js 14.x, error monitoring should be handled via error.tsx boundaries
// or middleware-level error handling
