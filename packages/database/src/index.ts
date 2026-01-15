/**
 * @carecircle/database - Shared Prisma client
 * 
 * Features:
 * - Singleton pattern for connection reuse
 * - Graceful shutdown hooks
 * - Configurable logging per environment
 * - Connection pool tuning via env vars
 */

import { PrismaClient, Prisma } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface PrismaClientOptions {
  logLevel?: 'query' | 'info' | 'warn' | 'error';
  serviceName?: string;
}

// ============================================================================
// GLOBAL SINGLETON
// ============================================================================

const globalForPrisma = globalThis as unknown as { 
  prisma: PrismaClient;
  shutdownHooksRegistered: boolean;
};

// ============================================================================
// LOGGING CONFIG
// ============================================================================

function getLogConfig(): Prisma.LogLevel[] {
  const env = process.env.NODE_ENV;
  const logLevel = process.env.PRISMA_LOG_LEVEL;

  // Custom log level if specified
  if (logLevel) {
    return logLevel.split(',').map(l => l.trim()) as Prisma.LogLevel[];
  }

  // Defaults per environment
  if (env === 'development') {
    return ['query', 'error', 'warn'];
  }
  
  if (env === 'test') {
    return ['error'];
  }
  
  // Production - only errors
  return ['error'];
}

// ============================================================================
// PRISMA CLIENT FACTORY
// ============================================================================

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: getLogConfig(),
    // Connection pool can be tuned via DATABASE_URL params:
    // ?connection_limit=10&pool_timeout=30
  });

  return client;
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// ============================================================================
// SHUTDOWN HOOKS
// ============================================================================

/**
 * Register shutdown hooks for graceful Prisma disconnection.
 * Call this in long-running processes (workers, API servers).
 */
export function registerPrismaShutdownHooks(): void {
  if (globalForPrisma.shutdownHooksRegistered) {
    return;
  }

  // Handle Node.js exit events
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  
  signals.forEach((signal) => {
    process.on(signal, async () => {
      console.log(`[Prisma] Received ${signal}, disconnecting...`);
      await prisma.$disconnect();
      console.log('[Prisma] Disconnected');
    });
  });

  // Handle before exit
  process.on('beforeExit', async () => {
    console.log('[Prisma] Before exit, disconnecting...');
    await prisma.$disconnect();
  });

  // Log slow queries in development
  if (process.env.NODE_ENV === 'development' && process.env.PRISMA_SLOW_QUERY_LOG === 'true') {
    prisma.$on('query' as never, (e: Prisma.QueryEvent) => {
      if (e.duration > 100) {
        console.warn(`[Prisma] Slow query (${e.duration}ms):`, e.query);
      }
    });
  }

  globalForPrisma.shutdownHooksRegistered = true;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Check database connectivity
 */
export async function checkConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Get database connection info (safe for logging)
 */
export function getConnectionInfo(): { host: string; database: string } {
  const url = process.env.DATABASE_URL || '';
  try {
    const parsed = new URL(url);
    return {
      host: parsed.host,
      database: parsed.pathname.replace('/', ''),
    };
  } catch {
    return { host: 'unknown', database: 'unknown' };
  }
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export * from '@prisma/client';
