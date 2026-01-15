/**
 * Notification Worker
 * 
 * Handles sending notifications via multiple channels:
 * - Push (Web Push with VAPID)
 * - Email (Nodemailer/SMTP)
 * - SMS (Twilio)
 * - In-App (Database only)
 * 
 * Features:
 * - Web Push with VAPID keys
 * - Proper subscription cleanup on invalid endpoints
 * - Email templates
 * - SMS via Twilio
 */

import { Worker, Job } from 'bullmq';
import { prisma } from '@carecircle/database';
import { 
  NotificationJobSchema, 
  validateJobPayload,
  isWebPushConfigured,
  getWebPushConfig,
  type NotificationJob 
} from '@carecircle/config';
import { 
  getRedisConnection, 
  QUEUE_NAMES, 
  getDefaultWorkerOptions,
  logger 
} from '../config';
import { moveToDeadLetter } from '../queues';
import { createJobLogger } from '@carecircle/logger';

// ============================================================================
// WEB PUSH (Lazy loaded)
// ============================================================================

let webPush: typeof import('web-push') | null = null;
let webPushInitialized = false;

async function initWebPush(): Promise<typeof import('web-push') | null> {
  if (!isWebPushConfigured()) {
    return null;
  }

  if (webPushInitialized) {
    return webPush;
  }

  const config = getWebPushConfig();
  if (!config) {
    return null;
  }

  webPush = await import('web-push');
  webPush.setVapidDetails(
    config.subject,
    config.publicKey,
    config.privateKey
  );

  webPushInitialized = true;
  logger.info('Web Push initialized with VAPID keys');
  
  return webPush;
}

// ============================================================================
// PUSH NOTIFICATION SENDER (Web Push)
// ============================================================================

async function sendPushNotification(
  job: Job<NotificationJob>,
  jobLogger: ReturnType<typeof createJobLogger>
): Promise<{ sent: number; failed: number; invalidSubscriptions: string[] }> {
  const { userId, title, body, data, priority } = job.data;

  const push = await initWebPush();
  if (!push) {
    jobLogger.info('Web Push not configured, skipping push notification');
    return { sent: 0, failed: 0, invalidSubscriptions: [] };
  }

  // Get user's push subscriptions (stored as PushToken with subscription JSON)
  const pushTokens = await prisma.pushToken.findMany({
    where: { userId },
  });

  if (pushTokens.length === 0) {
    jobLogger.debug({ userId }, 'No push subscriptions for user');
    return { sent: 0, failed: 0, invalidSubscriptions: [] };
  }

  const payload = JSON.stringify({
    title,
    body,
    data: data || {},
    timestamp: Date.now(),
    tag: `notification-${job.id}`,
    requireInteraction: priority === 'high',
  });

  const invalidSubscriptions: string[] = [];
  let sent = 0;
  let failed = 0;

  for (const token of pushTokens) {
    try {
      // The token field contains the subscription JSON for web push
      const subscription = JSON.parse(token.token);
      
      await push.sendNotification(subscription, payload, {
        TTL: priority === 'high' ? 86400 : 3600, // 24h for high priority, 1h otherwise
        urgency: priority === 'high' ? 'high' : 'normal',
      });
      
      sent++;
    } catch (error: unknown) {
      failed++;
      
      // Check if subscription is invalid/expired
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        invalidSubscriptions.push(token.id);
      } else {
        jobLogger.warn({ 
          err: error, 
          tokenId: token.id 
        }, 'Failed to send push notification');
      }
    }
  }

  // Clean up invalid subscriptions
  if (invalidSubscriptions.length > 0) {
    await prisma.pushToken.deleteMany({
      where: { id: { in: invalidSubscriptions } },
    });
    jobLogger.info({ count: invalidSubscriptions.length }, 'Cleaned up invalid push subscriptions');
  }

  jobLogger.info({ sent, failed, invalidSubscriptions: invalidSubscriptions.length }, 'Push notifications sent');

  return { sent, failed, invalidSubscriptions };
}

// ============================================================================
// EMAIL SENDER
// ============================================================================

import * as nodemailer from 'nodemailer';

let emailTransporter: nodemailer.Transporter | null = null;

function getEmailTransporter(): nodemailer.Transporter | null {
  if (emailTransporter) return emailTransporter;

  const smtpHost = process.env.SMTP_HOST || process.env.MAILTRAP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || process.env.MAILTRAP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER || process.env.MAILTRAP_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.MAILTRAP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    return null;
  }

  emailTransporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  return emailTransporter;
}

async function sendEmailNotification(
  job: Job<NotificationJob>,
  jobLogger: ReturnType<typeof createJobLogger>
): Promise<{ sent: boolean }> {
  const { userId, title, body } = job.data;

  const transporter = getEmailTransporter();
  if (!transporter) {
    jobLogger.info('Email not configured, skipping');
    return { sent: false };
  }

  // Get user's email
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, fullName: true },
  });

  if (!user) {
    jobLogger.warn({ userId }, 'User not found for email notification');
    return { sent: false };
  }

  const fromEmail = process.env.EMAIL_FROM || 'noreply@carecircle.com';
  const fromName = process.env.EMAIL_FROM_NAME || 'CareCircle';

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: user.email,
    subject: title,
    text: body,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">${title}</h2>
        <p style="font-size: 16px; color: #374151;">${body}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 12px; color: #9ca3af;">
          This is an automated notification from CareCircle. 
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings/notifications">Manage notification preferences</a>
        </p>
      </div>
    `,
  });

  jobLogger.info({ userId }, 'Email notification sent');
  return { sent: true };
}

// ============================================================================
// SMS SENDER (Twilio)
// ============================================================================

let twilioClient: import('twilio').Twilio | null = null;

async function getTwilioClient(): Promise<import('twilio').Twilio | null> {
  if (twilioClient) return twilioClient;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return null;
  }

  const twilio = await import('twilio');
  twilioClient = twilio.default(accountSid, authToken);
  return twilioClient;
}

async function sendSmsNotification(
  job: Job<NotificationJob>,
  jobLogger: ReturnType<typeof createJobLogger>
): Promise<{ sent: boolean }> {
  const { userId, title, body } = job.data;

  const client = await getTwilioClient();
  if (!client) {
    jobLogger.info('Twilio not configured, skipping SMS');
    return { sent: false };
  }

  // Get user's phone
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true, phoneVerified: true },
  });

  if (!user?.phone || !user.phoneVerified) {
    jobLogger.debug({ userId }, 'User has no verified phone for SMS');
    return { sent: false };
  }

  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!fromNumber) {
    jobLogger.warn('TWILIO_PHONE_NUMBER not configured');
    return { sent: false };
  }

  // SMS has a 160 character limit, combine title and body smartly
  const message = `${title}\n${body}`.substring(0, 160);

  await client.messages.create({
    body: message,
    from: fromNumber,
    to: user.phone,
  });

  jobLogger.info({ userId }, 'SMS notification sent');
  return { sent: true };
}

// ============================================================================
// WORKER PROCESSOR
// ============================================================================

async function processNotification(job: Job<NotificationJob>) {
  const jobLogger = createJobLogger(logger, job.id || 'unknown', 'notification');
  
  // Validate job payload
  const validatedData = validateJobPayload(
    NotificationJobSchema,
    job.data,
    'NotificationJob'
  );

  const { type, userId } = validatedData;

  jobLogger.info({ type, userId }, 'Processing notification');

  switch (type) {
    case 'PUSH':
      return await sendPushNotification(job, jobLogger);
    
    case 'EMAIL':
      return await sendEmailNotification(job, jobLogger);
    
    case 'SMS':
      return await sendSmsNotification(job, jobLogger);
    
    case 'IN_APP':
      // In-app notifications are already created in the database
      // by the original worker, nothing to do here
      jobLogger.debug('In-app notification (no additional action needed)');
      return { success: true };
    
    default:
      jobLogger.warn({ type }, 'Unknown notification type');
      return { skipped: true, reason: 'unknown_type' };
  }
}

// ============================================================================
// ERROR CLASSIFICATION
// ============================================================================

type ErrorType = 'transient' | 'permanent';

function classifyError(error: unknown): ErrorType {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Network/connection errors are transient
    if (
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('rate limit')
    ) {
      return 'transient';
    }
    
    // Invalid tokens/users are permanent
    if (
      message.includes('invalid') ||
      message.includes('not found') ||
      message.includes('unregistered')
    ) {
      return 'permanent';
    }
  }
  
  return 'transient';
}

// ============================================================================
// WORKER INSTANCE
// ============================================================================

const workerOptions = getDefaultWorkerOptions();

export const notificationWorker = new Worker<NotificationJob>(
  QUEUE_NAMES.NOTIFICATIONS,
  async (job) => {
    try {
      return await processNotification(job);
    } catch (error) {
      const errorType = classifyError(error);
      const jobLogger = createJobLogger(logger, job.id || 'unknown', 'notification');
      
      if (errorType === 'permanent') {
        await moveToDeadLetter(
          QUEUE_NAMES.NOTIFICATIONS,
          job.id || 'unknown',
          'notification',
          job.data,
          error instanceof Error ? error.message : String(error),
          job.attemptsMade
        );
        
        jobLogger.error({ err: error, errorType }, 'Permanent failure, moved to DLQ');
        return { failed: true, movedToDLQ: true };
      }
      
      throw error;
    }
  },
  {
    connection: getRedisConnection(),
    ...workerOptions,
    concurrency: 20, // Higher concurrency for notifications
  }
);

// ============================================================================
// WORKER EVENTS
// ============================================================================

notificationWorker.on('completed', (job, result) => {
  const jobLogger = createJobLogger(logger, job.id || 'unknown', 'notification');
  jobLogger.debug({ result }, 'Job completed');
});

notificationWorker.on('failed', (job, err) => {
  const jobLogger = createJobLogger(logger, job?.id || 'unknown', 'notification');
  jobLogger.error({ err, attemptsMade: job?.attemptsMade }, 'Job failed');
});

notificationWorker.on('error', (err) => {
  logger.error({ err }, 'Worker error');
});
