import 'dotenv/config';
import { medicationReminderWorker } from './workers/medication-reminder.worker';
import { appointmentReminderWorker } from './workers/appointment-reminder.worker';
import { shiftReminderWorker } from './workers/shift-reminder.worker';
import { reminderScheduler } from './scheduler';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT || '6379';

console.log('');
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║                                                              ║');
console.log('║   ⚙️   CareCircle Background Workers                         ║');
console.log('║                                                              ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log('║                                                              ║');
console.log(`║   🔗  Redis: ${redisHost}:${redisPort}`.padEnd(63) + '║');
console.log('║                                                              ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log('║                                                              ║');
console.log('║   Active Workers:                                            ║');
console.log('║                                                              ║');
console.log('║   💊  Medication Reminder Worker                             ║');
console.log('║   📅  Appointment Reminder Worker                            ║');
console.log('║   👤  Shift Reminder Worker                                  ║');
console.log('║                                                              ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');

// Start all workers
const workers = [
  medicationReminderWorker,
  appointmentReminderWorker,
  shiftReminderWorker,
];

// Start the scheduler that queues reminders
reminderScheduler.start();

console.log('✅ All workers started and listening for jobs');
console.log('');

// Graceful shutdown
const shutdown = async () => {
  console.log('');
  console.log('🛑 Shutting down workers...');
  
  reminderScheduler.stop();
  
  await Promise.all(workers.map(w => w.close()));
  
  console.log('👋 Workers shut down gracefully');
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
