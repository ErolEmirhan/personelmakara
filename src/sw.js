/* eslint-disable no-undef */
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkOnly, NetworkFirst } from 'workbox-strategies';
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import { BRANCH_FIREBASE } from './config/firebase';

const CACHE_GENERATION = 'makara-v3';

self.skipWaiting();
clientsClaim();

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Eski JS/CSS önbelleklerini temizle (iOS stale bundle tuzağı)
      if ('caches' in self) {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((key) => !key.includes(CACHE_GENERATION))
            .map((key) => caches.delete(key))
        );
      }

      await self.clients.claim();
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      clients.forEach((client) => {
        client.postMessage({ type: 'MAKARA_SW_ACTIVATED' });
      });
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'PURGE_CACHES') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
    );
  }
});

/** Yalnızca ikon/ses — JS/CSS asla precache edilmez */
function buildPrecacheManifest(manifest) {
  return manifest.filter((entry) => {
    const url = typeof entry === 'string' ? entry : entry.url;
    const path = url.split('?')[0].toLowerCase();
    if (/\.(js|css|mjs|html)$/.test(path)) return false;
    if (path.includes('/assets/')) return false;
    if (path.endsWith('index.html') || path === '/' || path.endsWith('/')) return false;
    return true;
  });
}

precacheAndRoute(buildPrecacheManifest(self.__WB_MANIFEST));
cleanupOutdatedCaches();

/** HTML: her zaman ağ — eski shell iOS'ta takılmasın */
registerRoute(new NavigationRoute(new NetworkOnly()));

/** JS/CSS: ağ öncelikli, kısa timeout — stale bundle servis etme */
registerRoute(
  ({ request, url }) => (
    request.destination === 'script'
    || request.destination === 'style'
    || /\.(js|css|mjs)$/.test(url.pathname)
  ),
  new NetworkFirst({
    cacheName: `${CACHE_GENERATION}-assets`,
    networkTimeoutSeconds: 8,
    plugins: [
      {
        cacheWillUpdate: async ({ response }) => (
          response && response.status === 200 ? response : null
        ),
      },
    ],
  })
);

const app = initializeApp(BRANCH_FIREBASE.makara.main);
const messaging = getMessaging(app);

function parsePushPayload(payload) {
  const data = payload?.data || {};
  const customTitle =
    payload?.notification?.title ||
    data.title ||
    'MAKARA · Ekip bildirimi';
  const message =
    payload?.notification?.body ||
    data.body ||
    '';
  return { customTitle, message, data };
}

function isTableCallData(data = {}) {
  if (data?.type === 'table_call') return true;
  const id = String(data?.announcementId || data?.callId || '');
  return id.startsWith('tablecall-');
}

function isOrderCallData(data = {}) {
  return data?.type === 'order_call';
}

function isOperationalPushData(data = {}) {
  return isTableCallData(data) || isOrderCallData(data);
}

function formatPushDisplay(customTitle, message) {
  const headline = (customTitle || '').trim();
  const text = (message || '').trim();
  const hasHeadline = headline && headline !== 'MAKARA · Ekip bildirimi';

  return {
    title: '\u200B',
    body: hasHeadline ? `${headline}\n${text}` : text,
  };
}

function showPushNotification(customTitle, message, data) {
  const { title, body } = formatPushDisplay(customTitle, message);
  const icon = new URL('icons/icon-192.png', self.location.origin).href;
  const tableCall = isTableCallData(data);
  const orderCall = isOrderCallData(data);
  const tag = data?.ticketId
    ? `makara-support-${data.ticketId}`
    : tableCall
      ? `makara-table-call-${data.callId || data.announcementId || 'x'}`
      : orderCall
        ? `makara-order-call-${data.orderCallId || 'x'}`
        : data?.announcementId
          ? `makara-announcement-${data.announcementId}`
          : 'makara-staff-announcement';

  return self.registration.showNotification(title, {
    body,
    icon,
    badge: icon,
    tag,
    silent: false,
    vibrate: isOperationalPushData(data) ? [100, 50, 100, 50, 160] : undefined,
    data: { ...data, title: customTitle, body: message },
  });
}

function openFromNotification(data) {
  const isSupport = data?.type === 'staff_support';
  const isTableCall = isTableCallData(data);
  const isOrderCall = isOrderCallData(data);
  const ticketId = data?.ticketId || '';
  const tableNumber = data?.tableNumber || '';
  const base = self.location.pathname.replace(/\/[^/]*$/, '/') || '/';
  const openPath = isTableCall
    ? `${base}?tab=tables${tableNumber ? `&table=${encodeURIComponent(tableNumber)}` : ''}`
    : isOrderCall
      ? `${base}?tab=orders&view=order_calls${tableNumber ? `&table=${encodeURIComponent(tableNumber)}` : ''}`
      : isSupport && ticketId
        ? `${base}?open=support&ticket=${encodeURIComponent(ticketId)}`
        : `${base}?tab=notifications`;

  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
    for (const client of windowClients) {
      client.postMessage({
        type: isTableCall ? 'OPEN_TABLES' : isOrderCall ? 'OPEN_ORDERS' : isSupport ? 'OPEN_SUPPORT' : 'OPEN_NOTIFICATIONS',
        ticketId: ticketId || undefined,
        callId: data?.callId || undefined,
        orderCallId: data?.orderCallId || undefined,
        tableNumber: tableNumber || undefined,
        ordersView: isOrderCall ? 'order_calls' : undefined,
      });
      if ('focus' in client) return client.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow(openPath);
    return undefined;
  });
}

onBackgroundMessage(messaging, (payload) => {
  const { customTitle, message, data } = parsePushPayload(payload);

  if (payload.notification) {
    return;
  }

  return showPushNotification(customTitle, message, data);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification?.data || {};
  event.waitUntil(openFromNotification(data));
});
