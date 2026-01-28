/**
 * CareCircle Background Workers
 * 
 * Production-ready worker system with:
 * - Health checks
 * - Graceful shutdown
 * - Proper signal handling (including Windows)
 * - Startup self-tests
 * - Structured logging
 */

import 'dotenv/config';
import * as http from 'http';
import { getConfig, getRedisConnection, logger, getDefaultWorkerOptions, shouldDisableQueueEvents } from './config';
import { closeAllQueues } from './queues';

// Workers
import { medicationReminderWorker } from './workers/medication-reminder.worker';
import { appointmentReminderWorker } from './workers/appointment-reminder.worker';
import { shiftReminderWorker } from './workers/shift-reminder.worker';
import { notificationWorker } from './workers/notification.worker';
import { refillAlertWorker } from './workers/refill-alert.worker';
import { deadLetterWorker } from './workers/dead-letter.worker';

// Scheduler
import { reminderScheduler } from './scheduler';

// Prisma
import { prisma } from '@carecircle/database';

// ============================================================================
// CONFIGURATION
// ============================================================================

let config: ReturnType<typeof getConfig>;

try {
  config = getConfig();
} catch (error) {
  console.error('Failed to load configuration:', error);
  process.exit(1);
}

// ============================================================================
// HEALTH CHECK SERVER
// ============================================================================

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    redis: boolean;
    database: boolean;
    workers: {
      name: string;
      running: boolean;
    }[];
  };
}

const workers = [
  { name: 'medication-reminder', worker: medicationReminderWorker },
  { name: 'appointment-reminder', worker: appointmentReminderWorker },
  { name: 'shift-reminder', worker: shiftReminderWorker },
  { name: 'notification', worker: notificationWorker },
  { name: 'refill-alert', worker: refillAlertWorker },
  { name: 'dead-letter', worker: deadLetterWorker },
];

async function getHealthStatus(): Promise<HealthStatus> {
  const startTime = Date.now();
  
  // Check Redis
  let redisOk = false;
  try {
    const redis = getRedisConnection();
    await redis.ping();
    redisOk = true;
  } catch {
    redisOk = false;
  }

  // Check Database
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  // Check workers
  const workerStatuses = workers.map(({ name, worker }) => ({
    name,
    running: worker.isRunning(),
  }));

  const allWorkersRunning = workerStatuses.every((w) => w.running);
  const isHealthy = redisOk && dbOk && allWorkersRunning;

  return {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      redis: redisOk,
      database: dbOk,
      workers: workerStatuses,
    },
  };
}

const HEALTH_PORT = parseInt(process.env.HEALTH_PORT || '3002', 10);

const healthServer = http.createServer(async (req, res) => {
  if (req.url === '/health' || req.url === '/healthz') {
    try {
      const status = await getHealthStatus();
      const statusCode = status.status === 'healthy' ? 200 : 503;
      
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(status, null, 2));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'unhealthy', error: String(error) }));
    }
  } else if (req.url === '/ready') {
    // Readiness check - are we ready to process jobs?
    try {
      const status = await getHealthStatus();
      const isReady = status.checks.redis && status.checks.database;
      
      res.writeHead(isReady ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ready: isReady }));
    } catch {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ready: false }));
    }
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// ============================================================================
// STARTUP SELF-TESTS
// ============================================================================

async function runStartupTests(): Promise<boolean> {
  logger.info('Running startup self-tests...');

  // Test Redis connection
  try {
    const redis = getRedisConnection();
    await redis.ping();
    logger.info('✓ Redis connection OK');
  } catch (error) {
    logger.error({ err: error }, '✗ Redis connection failed');
    return false;
  }

  // Test Database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('✓ Database connection OK');
  } catch (error) {
    logger.error({ err: error }, '✗ Database connection failed');
    return false;
  }

  logger.info('All startup tests passed');
  return true;
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress');
    return;
  }

  isShuttingDown = true;
  logger.info({ signal }, 'Shutdown signal received');

  const shutdownTimeout = setTimeout(() => {
    logger.error('Shutdown timeout - forcing exit');
    process.exit(1);
  }, 30000); // 30 second timeout

  try {
    // Stop accepting new jobs
    reminderScheduler.stop();
    logger.info('Scheduler stopped');

    // Close health server
    healthServer.close();
    logger.info('Health server closed');

    // Close all workers (waits for active jobs to complete)
    await Promise.all(workers.map(({ name, worker }) => {
      logger.info({ worker: name }, 'Closing worker...');
      return worker.close();
    }));
    logger.info('All workers closed');

    // Close all queues
    await closeAllQueues();

    // Disconnect Prisma
    await prisma.$disconnect();
    logger.info('Database connection closed');

    // Close Redis
    const redis = getRedisConnection();
    redis.disconnect();
    logger.info('Redis connection closed');

    clearTimeout(shutdownTimeout);
    logger.info('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    clearTimeout(shutdownTimeout);
    logger.error({ err: error }, 'Error during shutdown');
    process.exit(1);
  }
}

// ============================================================================
// STARTUP BANNER
// ============================================================================

function printBanner(): void {
  const redisHost = config.REDIS_HOST;
  const redisPort = config.REDIS_PORT;
  const workerOptions = getDefaultWorkerOptions();
  const eventsDisabled = shouldDisableQueueEvents();
  
  logger.info({
    redis: `${redisHost}:${redisPort}`,
    healthPort: HEALTH_PORT,
    environment: config.NODE_ENV,
    logLevel: config.LOG_LEVEL,
    drainDelay: workerOptions.drainDelay,
    stalledInterval: workerOptions.stalledInterval,
    queueEventsDisabled: eventsDisabled,
  }, '');

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                                                              ║');
  console.log('║   ⚙️   CareCircle Background Workers                         ║');
  console.log('║                                                              ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║                                                              ║');
  console.log(`║   🔗  Redis: ${redisHost}:${redisPort}`.padEnd(63) + '║');
  console.log(`║   🏥  Health: http://localhost:${HEALTH_PORT}/health`.padEnd(63) + '║');
  console.log('║                                                              ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║                                                              ║');
  console.log('║   ⚡ Redis Optimization (Upstash-friendly):                  ║');
  console.log('║                                                              ║');
  console.log(`║   📊  Drain Delay: ${(workerOptions.drainDelay / 1000).toFixed(1)}s (polls when queue empty)`.padEnd(63) + '║');
  console.log(`║   🔍  Stalled Check: ${(workerOptions.stalledInterval / 1000).toFixed(0)}s`.padEnd(63) + '║');
  console.log(`║   📡  Queue Events: ${eventsDisabled ? 'Disabled (saves requests)' : 'Enabled'}`.padEnd(63) + '║');
  console.log('║                                                              ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║                                                              ║');
  console.log('║   Active Workers:                                            ║');
  console.log('║                                                              ║');
  console.log('║   💊  Medication Reminder Worker                             ║');
  console.log('║   📅  Appointment Reminder Worker                            ║');
  console.log('║   👤  Shift Reminder Worker                                  ║');
  console.log('║   📱  Notification Worker (Push/Email/SMS)                   ║');
  console.log('║   💊  Refill Alert Worker                                    ║');
  console.log('║   📋  Dead Letter Queue Worker                               ║');
  console.log('║                                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  printBanner();

  // Run startup tests
  const testsPass = await runStartupTests();
  if (!testsPass) {
    logger.error('Startup tests failed - exiting');
    process.exit(1);
  }

  // Start health server
  healthServer.listen(HEALTH_PORT, () => {
    logger.info({ port: HEALTH_PORT }, 'Health check server started');
  });

  // Start the scheduler that queues reminders
  reminderScheduler.start();

  logger.info('All workers started and listening for jobs');

  // Register shutdown handlers
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Windows-specific: handle SIGBREAK (Ctrl+Break)
  if (process.platform === 'win32') {
    process.on('SIGBREAK', () => shutdown('SIGBREAK'));
    
    // Handle Windows console close events via readline
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    rl.on('close', () => shutdown('STDIN_CLOSE'));
    rl.on('SIGINT', () => shutdown('SIGINT'));
  }

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception');
    shutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled rejection');
    // Don't shutdown on unhandled rejection, just log it
  });
}

main().catch((error) => {
  logger.fatal({ err: error }, 'Failed to start workers');
  process.exit(1);
});
