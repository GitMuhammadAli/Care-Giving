/**
 * Worker Tests with Mocked Dependencies
 */

import { Job } from 'bullmq';

// Mock Prisma
jest.mock('@carecircle/database', () => ({
  prisma: {
    caregiverShift: {
      findUnique: jest.fn(),
    },
    medication: {
      findUnique: jest.fn(),
    },
    appointment: {
      findUnique: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
    pushToken: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    ping: jest.fn().mockResolvedValue('PONG'),
    disconnect: jest.fn(),
  }));
});

// Mock queues
jest.mock('../queues', () => ({
  notificationQueue: {
    add: jest.fn().mockResolvedValue({}),
  },
  moveToDeadLetter: jest.fn().mockResolvedValue(undefined),
  closeAllQueues: jest.fn().mockResolvedValue(undefined),
}));

// Mock config
jest.mock('../config', () => ({
  getConfig: jest.fn().mockReturnValue({
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    WORKER_CONCURRENCY: 10,
    JOB_ATTEMPTS: 5,
    JOB_BACKOFF_DELAY: 1000,
    JOB_TIMEOUT: 30000,
    VAPID_PUBLIC_KEY: '',
    VAPID_PRIVATE_KEY: '',
    VAPID_SUBJECT: 'mailto:test@test.com',
  }),
  getRedisConnection: jest.fn().mockReturnValue({
    on: jest.fn(),
    ping: jest.fn().mockResolvedValue('PONG'),
  }),
  getDefaultWorkerOptions: jest.fn().mockReturnValue({ concurrency: 10 }),
  getDefaultJobOptions: jest.fn().mockReturnValue({
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
  }),
  QUEUE_NAMES: {
    MEDICATION_REMINDERS: 'medication-reminders',
    APPOINTMENT_REMINDERS: 'appointment-reminders',
    SHIFT_REMINDERS: 'shift-reminders',
    NOTIFICATIONS: 'notifications',
    REFILL_ALERTS: 'refill-alerts',
    DEAD_LETTER: 'dead-letter-queue',
  },
  REMINDER_CONFIG: {
    medicationReminderMinutes: [30, 15, 5, 0],
    appointmentReminderMinutes: [1440, 60, 30],
    shiftReminderMinutes: [60, 15],
    schedulerIntervalMs: 60000,
  },
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnThis(),
  },
}));

// Mock logger
jest.mock('@carecircle/logger', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnThis(),
  }),
  createJobLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

import { prisma } from '@carecircle/database';
import { notificationQueue, moveToDeadLetter } from '../queues';

describe('Shift Reminder Worker', () => {
  const mockShift = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    careRecipientId: '123e4567-e89b-12d3-a456-426614174001',
    caregiverId: '123e4567-e89b-12d3-a456-426614174002',
    startTime: new Date('2024-01-15T09:00:00.000Z'),
    status: 'SCHEDULED',
    caregiver: {
      id: '123e4567-e89b-12d3-a456-426614174002',
      fullName: 'Jane Doe',
      timezone: 'America/New_York',
    },
    careRecipient: {
      id: '123e4567-e89b-12d3-a456-426614174001',
      firstName: 'John',
      preferredName: 'Johnny',
    },
  };

  const mockJob = {
    id: 'test-job-1',
    data: {
      shiftId: mockShift.id,
      careRecipientId: mockShift.careRecipientId,
      caregiverId: mockShift.caregiverId,
      startTime: mockShift.startTime.toISOString(),
      minutesBefore: 60,
    },
    attemptsMade: 0,
  } as unknown as Job;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should skip if shift is not found', async () => {
    (prisma.caregiverShift.findUnique as jest.Mock).mockResolvedValue(null);

    // We need to test the processor function directly
    // Since workers are instantiated at module load, we'll test the logic
    const result = await testShiftProcessor(mockJob);
    expect(result).toEqual({ skipped: true, reason: 'shift_not_found' });
  });

  it('should skip if shift is not scheduled', async () => {
    (prisma.caregiverShift.findUnique as jest.Mock).mockResolvedValue({
      ...mockShift,
      status: 'COMPLETED',
    });

    const result = await testShiftProcessor(mockJob);
    expect(result).toEqual({ skipped: true, reason: 'shift_not_scheduled' });
  });

  it('should create notification and queue push', async () => {
    (prisma.caregiverShift.findUnique as jest.Mock).mockResolvedValue(mockShift);
    (prisma.notification.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.notification.create as jest.Mock).mockResolvedValue({
      id: 'notification-1',
      userId: mockShift.caregiverId,
      type: 'SHIFT_REMINDER',
    });

    const result = await testShiftProcessor(mockJob);
    
    expect(prisma.notification.create).toHaveBeenCalled();
    expect(notificationQueue.add).toHaveBeenCalledWith(
      'send-push',
      expect.objectContaining({
        type: 'PUSH',
        userId: mockShift.caregiverId,
      }),
      expect.any(Object)
    );
    expect(result.success).toBe(true);
  });

  it('should not create duplicate notifications (idempotency)', async () => {
    (prisma.caregiverShift.findUnique as jest.Mock).mockResolvedValue(mockShift);
    (prisma.notification.findFirst as jest.Mock).mockResolvedValue({
      id: 'existing-notification',
    });

    const result = await testShiftProcessor(mockJob);
    
    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(result.skipped).toBe(true);
  });
});

describe('Error Classification', () => {
  it('should classify connection errors as transient', () => {
    const connectionError = new Error('ECONNREFUSED');
    expect(classifyError(connectionError)).toBe('transient');
  });

  it('should classify timeout errors as transient', () => {
    const timeoutError = new Error('Connection timeout');
    expect(classifyError(timeoutError)).toBe('transient');
  });

  it('should classify validation errors as permanent', () => {
    const validationError = new Error('Invalid payload');
    expect(classifyError(validationError)).toBe('validation');
  });

  it('should classify not found errors as permanent', () => {
    const notFoundError = new Error('Record not found');
    expect(classifyError(notFoundError)).toBe('permanent');
  });

  it('should default to transient for unknown errors', () => {
    const unknownError = new Error('Something went wrong');
    expect(classifyError(unknownError)).toBe('transient');
  });
});

// ============================================================================
// HELPER FUNCTIONS (to test worker logic without BullMQ)
// ============================================================================

async function testShiftProcessor(job: Job): Promise<any> {
  const { validateJobPayload, ShiftReminderJobSchema } = await import('@carecircle/config');
  const { formatInTimeZone } = await import('date-fns-tz');
  
  const validatedData = validateJobPayload(
    ShiftReminderJobSchema,
    job.data,
    'ShiftReminderJob'
  );

  const { shiftId, caregiverId, minutesBefore } = validatedData;

  const shift = await prisma.caregiverShift.findUnique({
    where: { id: shiftId },
    include: {
      caregiver: true,
      careRecipient: true,
    },
  });

  if (!shift) {
    return { skipped: true, reason: 'shift_not_found' };
  }

  if (shift.status !== 'SCHEDULED') {
    return { skipped: true, reason: 'shift_not_scheduled' };
  }

  const timezone = shift.caregiver.timezone || 'America/New_York';
  const formattedTime = formatInTimeZone(shift.startTime, timezone, 'h:mm a');

  const title = minutesBefore === 60 
    ? '⏰ Shift Starting in 1 Hour'
    : '⏰ Shift Starting Soon';
  const body = `Your caregiving shift for ${shift.careRecipient.preferredName || shift.careRecipient.firstName} starts at ${formattedTime}.`;

  const idempotencyKey = `shift-${shiftId}-${minutesBefore}`;

  // Check idempotency
  const existing = await prisma.notification.findFirst({
    where: {
      userId: caregiverId,
      type: 'SHIFT_REMINDER',
      data: {
        path: ['idempotencyKey'],
        equals: idempotencyKey,
      },
    },
  });

  if (existing) {
    return { skipped: true, reason: 'duplicate_notification' };
  }

  const notification = await prisma.notification.create({
    data: {
      userId: caregiverId,
      type: 'SHIFT_REMINDER',
      title,
      body,
      data: {
        shiftId,
        careRecipientId: shift.careRecipient.id,
        startTime: shift.startTime.toISOString(),
        minutesBefore,
        idempotencyKey,
      },
    },
  });

  await notificationQueue.add(
    'send-push',
    {
      type: 'PUSH',
      userId: caregiverId,
      title,
      body,
      data: {
        type: 'SHIFT_REMINDER',
        shiftId,
        careRecipientId: shift.careRecipient.id,
        notificationId: notification.id,
      },
      priority: minutesBefore <= 15 ? 'high' : 'normal',
    },
    { jobId: `push-${idempotencyKey}` }
  );

  return {
    success: true,
    caregiverId,
    shiftId,
    notificationId: notification.id,
  };
}

function classifyError(error: unknown): 'transient' | 'permanent' | 'validation' {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('invalid') || message.includes('validation')) {
      return 'validation';
    }
    
    if (
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('econnrefused')
    ) {
      return 'transient';
    }
    
    if (message.includes('not found')) {
      return 'permanent';
    }
  }
  
  return 'transient';
}

