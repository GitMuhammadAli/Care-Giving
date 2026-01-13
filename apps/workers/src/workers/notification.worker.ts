import { Worker, Job } from 'bullmq';
import { prisma } from '@carecircle/database';
import { redisConnection, QUEUE_NAMES, config } from '../config';
import { NotificationJob } from '../queues';

// Firebase Admin SDK (lazy loaded)
let firebaseAdmin: typeof import('firebase-admin') | null = null;

async function getFirebaseAdmin() {
  if (!config.firebaseEnabled) return null;
  
  if (!firebaseAdmin) {
    firebaseAdmin = await import('firebase-admin');
    
    if (!firebaseAdmin.apps.length) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(serviceAccount),
      });
    }
  }
  
  return firebaseAdmin;
}

async function sendPushNotification(job: Job<NotificationJob>) {
  const { userId, title, body, data, priority } = job.data;

  try {
    const admin = await getFirebaseAdmin();
    if (!admin) {
      console.log('Firebase not configured, skipping push notification');
      return;
    }

    // Get user's push tokens
    const pushTokens = await prisma.pushToken.findMany({
      where: { userId },
    });

    if (pushTokens.length === 0) {
      console.log(`No push tokens for user ${userId}`);
      return;
    }

    const messages = pushTokens.map((token: (typeof pushTokens)[number]) => ({
      token: token.token,
      notification: {
        title,
        body,
      },
      data: data || {},
      android: {
        priority: priority === 'high' ? 'high' as const : 'normal' as const,
        notification: {
          sound: 'default',
          channelId: priority === 'high' ? 'urgent' : 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            ...(priority === 'high' && {
              'interruption-level': 'time-sensitive',
            }),
          },
        },
      },
    }));

    const response = await admin.messaging().sendEach(messages);
    
    // Clean up invalid tokens
    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
        prisma.pushToken.delete({
          where: { id: pushTokens[idx].id },
        }).catch(console.error);
      }
    });

    console.log(`📱 Push notifications sent: ${response.successCount} success, ${response.failureCount} failed`);
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
}

async function processNotification(job: Job<NotificationJob>) {
  const { type } = job.data;

  switch (type) {
    case 'PUSH':
      await sendPushNotification(job);
      break;
    case 'SMS':
      // TODO: Implement Twilio SMS
      console.log('SMS notifications not yet implemented');
      break;
    case 'EMAIL':
      // TODO: Implement email notifications
      console.log('Email notifications not yet implemented');
      break;
    case 'IN_APP':
      // In-app notifications are created directly in the database
      break;
    default:
      console.log(`Unknown notification type: ${type}`);
  }
}

export const notificationWorker = new Worker<NotificationJob>(
  QUEUE_NAMES.NOTIFICATIONS,
  processNotification,
  {
    connection: redisConnection,
    concurrency: 20,
  }
);

notificationWorker.on('completed', (job) => {
  console.log(`📱 Notification job ${job.id} completed`);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`📱 Notification job ${job?.id} failed:`, err);
});

