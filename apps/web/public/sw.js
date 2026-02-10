// CareCircle Service Worker
// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: Bump CACHE_VERSION on every deploy so returning users get fresh
// assets. The activate handler automatically purges older caches.
// ─────────────────────────────────────────────────────────────────────────────
const CACHE_VERSION = 2;
const CACHE_NAME = `carecircle-v${CACHE_VERSION}`;
const OFFLINE_URL = '/offline';

// Only truly static assets that rarely change (images, icons, manifest)
const PRECACHE_ASSETS = [
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/badge-72x72.png',
  '/icons/apple-touch-icon.png',
];

// Install event - cache only the minimal offline shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching offline shell assets');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  // Activate immediately — don't wait for old tabs to close
  self.skipWaiting();
});

// Activate event - purge ALL old caches so users get fresh code
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Purging old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Take control of ALL open tabs immediately
  self.clients.claim();
});

// ─── Fetch strategies ─────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Skip non-GET requests entirely (POST, PUT, DELETE go straight to network)
  if (request.method !== 'GET') {
    return;
  }

  // ── Strategy 1: NETWORK-ONLY for API requests ──────────────────────────
  // Never cache API calls — we always want live data
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(request) || new Response('Offline', { status: 503 });
      })
    );
    return;
  }

  // ── Strategy 2: NETWORK-FIRST for pages & JS/CSS bundles ───────────────
  // Always try the network first so users get the latest deploy.
  // Only fall back to cache when offline.
  if (
    request.mode === 'navigate' ||                     // HTML page navigations
    url.pathname.startsWith('/_next/') ||               // Next.js JS/CSS chunks
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.html')
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache a copy for offline fallback
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            // Offline fallback for navigation
            if (request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            return new Response('Offline', { status: 503 });
          });
        })
    );
    return;
  }

  // ── Strategy 3: STALE-WHILE-REVALIDATE for images & other static files ─
  // Serve from cache instantly, but update the cache in the background.
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // If offline and no cache, return a graceful error
          if (request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
          return new Response('Offline', { status: 503 });
        });

      // Return cached version immediately if available, otherwise wait for network
      return cachedResponse || networkFetch;
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
