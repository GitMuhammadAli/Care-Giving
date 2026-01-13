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
  if (!event.data) return;

  try {
    const data = event.data.json();
    const { title, body, icon, badge, tag, data: notificationData } = data;

    const options = {
      body: body || '',
      icon: icon || '/icons/icon-192x192.png',
      badge: badge || '/icons/badge-72x72.png',
      tag: tag || 'carecircle-notification',
      vibrate: [200, 100, 200],
      requireInteraction: notificationData?.type === 'emergency',
      data: notificationData,
      actions: getNotificationActions(notificationData?.type),
    };

    event.waitUntil(
      self.registration.showNotification(title || 'CareCircle', options)
    );
  } catch (error) {
    console.error('[SW] Push notification error:', error);
  }
});

// Get actions based on notification type
function getNotificationActions(type) {
  switch (type) {
    case 'medication_reminder':
      return [
        { action: 'given', title: '✓ Given' },
        { action: 'snooze', title: '⏰ Snooze' },
      ];
    case 'emergency':
      return [
        { action: 'view', title: '👁️ View' },
        { action: 'call', title: '📞 Call' },
      ];
    case 'appointment_reminder':
      return [
        { action: 'view', title: '📅 View' },
      ];
    default:
      return [];
  }
}

// Notification click event
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  notification.close();

  let url = '/dashboard';

  // Handle specific actions
  switch (action) {
    case 'given':
      // Handle medication given - will be processed by the app
      url = `/medications?log=${data.medicationId}`;
      break;
    case 'snooze':
      // Snooze for 15 minutes
      setTimeout(() => {
        self.registration.showNotification(notification.title, {
          ...notification,
          tag: `${notification.tag}-snoozed`,
        });
      }, 15 * 60 * 1000);
      return;
    case 'view':
      url = data.url || '/dashboard';
      break;
    case 'call':
      // Open phone dialer
      if (data.phone) {
        url = `tel:${data.phone}`;
      }
      break;
    default:
      // Default click - open relevant page
      if (data.type === 'emergency') {
        url = '/emergency';
      } else if (data.type === 'medication_reminder') {
        url = '/medications';
      } else if (data.type === 'appointment_reminder') {
        url = '/calendar';
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

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-actions') {
    event.waitUntil(syncOfflineActions());
  }
});

async function syncOfflineActions() {
  // This will trigger the app to sync pending actions
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_OFFLINE_ACTIONS' });
  });
}

console.log('[SW] Service Worker loaded');
