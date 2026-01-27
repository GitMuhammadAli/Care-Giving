// CareCircle Service Worker
const CACHE_NAME = 'carecircle-v1';
const OFFLINE_URL = '/offline';

// Files to cache for offline use
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API requests - network first, cache fallback for GET
  if (url.pathname.startsWith('/api/')) {
    if (request.method === 'GET') {
      event.respondWith(
        fetch(request)
          .then((response) => {
            // Clone and cache successful responses
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            return caches.match(request);
          })
      );
    }
    return;
  }

  // Static assets - cache first
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((response) => {
          // Cache new requests
          if (response.ok && request.method === 'GET') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return offline page for navigation requests
          if (request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
          return new Response('Offline', { status: 503 });
        });
    })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('[SW] Push event but no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[SW] Push notification received:', data);

    const { title, body, icon, badge, tag, requireInteraction, data: notificationData, actions } = data;

    const options = {
      body: body || '',
      icon: icon || '/icons/icon-192x192.png',
      badge: badge || '/icons/badge-72x72.png',
      tag: tag || 'carecircle-notification',
      vibrate: getVibrationPattern(notificationData?.type),
      requireInteraction: requireInteraction || notificationData?.type === 'EMERGENCY_ALERT',
      data: notificationData,
      actions: actions || getNotificationActions(notificationData?.type),
      timestamp: notificationData?.timestamp ? new Date(notificationData.timestamp).getTime() : Date.now(),
      renotify: true,
    };

    // Play sound for emergency alerts
    if (notificationData?.type === 'EMERGENCY_ALERT') {
      options.silent = false;
    }

    event.waitUntil(
      self.registration.showNotification(title || 'CareCircle', options)
    );
  } catch (error) {
    console.error('[SW] Push notification error:', error);
    // Try to show a basic notification even if parsing fails
    event.waitUntil(
      self.registration.showNotification('CareCircle', {
        body: event.data.text(),
        icon: '/icons/icon-192x192.png',
      })
    );
  }
});

// Get vibration pattern based on notification type
function getVibrationPattern(type) {
  switch (type) {
    case 'EMERGENCY_ALERT':
      return [500, 200, 500, 200, 500]; // Long urgent pattern
    case 'MEDICATION_REMINDER':
      return [200, 100, 200]; // Short attention pattern
    case 'APPOINTMENT_REMINDER':
      return [200, 100, 200, 100, 200]; // Moderate pattern
    case 'CHAT_MESSAGE':
      return [100, 50, 100]; // Quick pattern
    case 'SHIFT_REMINDER':
      return [300, 100, 300]; // Medium pattern
    default:
      return [200, 100, 200]; // Default pattern
  }
}

// Get actions based on notification type
function getNotificationActions(type) {
  switch (type) {
    case 'MEDICATION_REMINDER':
      return [
        { action: 'log', title: '✓ Mark as Taken' },
        { action: 'snooze', title: '⏰ Snooze 15min' },
      ];
    case 'EMERGENCY_ALERT':
      return [
        { action: 'view', title: '👁️ View Details' },
        { action: 'acknowledge', title: '✓ Acknowledge' },
      ];
    case 'APPOINTMENT_REMINDER':
      return [
        { action: 'view', title: '📅 View Details' },
        { action: 'dismiss', title: '✕ Dismiss' },
      ];
    case 'CHAT_MESSAGE':
      return [
        { action: 'reply', title: '↩️ Reply' },
        { action: 'view', title: '👁️ View Chat' },
      ];
    case 'SHIFT_REMINDER':
      return [
        { action: 'checkin', title: '✓ Check In' },
      ];
    default:
      return [
        { action: 'view', title: '👁️ View' },
        { action: 'dismiss', title: '✕ Dismiss' },
      ];
  }
}

// Notification click event
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  notification.close();

  console.log('[SW] Notification clicked:', action, data);

  let url = data.url || '/dashboard';

  // Handle specific actions
  switch (action) {
    case 'log':
      // Handle medication logged - navigate to medications page
      url = data.medicationId ? `/medications?log=${data.medicationId}` : '/medications';
      break;

    case 'snooze':
      // Snooze for 15 minutes - schedule another notification
      event.waitUntil(
        new Promise((resolve) => {
          setTimeout(async () => {
            await self.registration.showNotification(notification.title, {
              body: notification.body,
              icon: notification.icon,
              badge: notification.badge,
              tag: `${notification.tag}-snoozed`,
              data: notification.data,
              vibrate: [200, 100, 200],
              actions: getNotificationActions(data.type),
            });
            resolve();
          }, 15 * 60 * 1000); // 15 minutes
        })
      );
      // Also notify the app about the snooze
      notifyClients({ type: 'SNOOZE_NOTIFICATION', data });
      return;

    case 'view':
      url = data.url || '/dashboard';
      break;

    case 'acknowledge':
      // Acknowledge emergency - navigate and mark as acknowledged
      url = data.alertId ? `/emergency?acknowledge=${data.alertId}` : '/emergency';
      notifyClients({ type: 'ACKNOWLEDGE_ALERT', alertId: data.alertId });
      break;

    case 'reply':
      // Reply to chat - open chat page
      url = data.familyId ? `/chat?family=${data.familyId}&reply=true` : '/chat';
      break;

    case 'checkin':
      // Check in for shift
      url = data.shiftId ? `/shifts?checkin=${data.shiftId}` : '/shifts';
      notifyClients({ type: 'SHIFT_CHECKIN', shiftId: data.shiftId });
      break;

    case 'dismiss':
      // Just dismiss, no navigation
      notifyClients({ type: 'DISMISS_NOTIFICATION', notificationId: data.notificationId });
      return;

    default:
      // Default click - open relevant page based on notification type
      switch (data.type) {
        case 'EMERGENCY_ALERT':
          url = data.alertId ? `/emergency?id=${data.alertId}` : '/emergency';
          break;
        case 'MEDICATION_REMINDER':
          url = '/medications';
          break;
        case 'APPOINTMENT_REMINDER':
          url = data.appointmentId ? `/calendar?appointment=${data.appointmentId}` : '/calendar';
          break;
        case 'CHAT_MESSAGE':
          url = data.familyId ? `/chat?family=${data.familyId}` : '/chat';
          break;
        case 'SHIFT_REMINDER':
          url = '/shifts';
          break;
        default:
          url = data.url || '/dashboard';
      }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Helper to notify all clients
async function notifyClients(message) {
  const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clientList.forEach((client) => {
    client.postMessage(message);
  });
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event:', event.tag);

  switch (event.tag) {
    case 'sync-offline-actions':
      event.waitUntil(syncOfflineActions());
      break;
    case 'sync-medication-logs':
      event.waitUntil(syncMedicationLogs());
      break;
    case 'sync-timeline-entries':
      event.waitUntil(syncTimelineEntries());
      break;
  }
});

async function syncOfflineActions() {
  // This will trigger the app to sync pending actions
  await notifyClients({ type: 'SYNC_OFFLINE_ACTIONS' });
}

async function syncMedicationLogs() {
  await notifyClients({ type: 'SYNC_MEDICATION_LOGS' });
}

async function syncTimelineEntries() {
  await notifyClients({ type: 'SYNC_TIMELINE_ENTRIES' });
}

// Handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Push subscription change event
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed');

  event.waitUntil(
    notifyClients({ type: 'PUSH_SUBSCRIPTION_CHANGED' })
  );
});

console.log('[SW] Service Worker loaded - version:', CACHE_NAME);
