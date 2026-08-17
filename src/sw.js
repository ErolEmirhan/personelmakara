/* eslint-disable no-undef */
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import { BRANCH_FIREBASE } from './config/firebase';

self.skipWaiting();
clientsClaim();

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
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
});

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

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
  const tag = data?.ticketId
    ? `makara-support-${data.ticketId}`
    : tableCall
      ? `makara-table-call-${data.callId || data.announcementId || 'x'}`
      : data?.announcementId
        ? `makara-announcement-${data.announcementId}`
        : 'makara-staff-announcement';

  if (tableCall) {
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'PLAY_TABLE_CALL_SOUND' });
      });
    });
  }

  return self.registration.showNotification(title, {
    body,
    icon,
    badge: icon,
    tag,
    silent: false,
    vibrate: tableCall ? [100, 50, 100, 50, 160] : undefined,
    data: { ...data, title: customTitle, body: message },
  });
}

function openFromNotification(data) {
  const isSupport = data?.type === 'staff_support';
  const isTableCall = isTableCallData(data);
  const ticketId = data?.ticketId || '';
  const base = self.location.pathname.replace(/\/[^/]*$/, '/') || '/';
  const openPath = isTableCall
    ? `${base}?tab=tables`
    : isSupport && ticketId
      ? `${base}?open=support&ticket=${encodeURIComponent(ticketId)}`
      : `${base}?tab=notifications`;

  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
    for (const client of windowClients) {
      client.postMessage({
        type: isTableCall ? 'OPEN_TABLES' : isSupport ? 'OPEN_SUPPORT' : 'OPEN_NOTIFICATIONS',
        ticketId: ticketId || undefined,
        callId: data?.callId || undefined,
      });
      if ('focus' in client) return client.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow(openPath);
    return undefined;
  });
}

onBackgroundMessage(messaging, (payload) => {
  const { customTitle, message, data } = parsePushPayload(payload);
  return showPushNotification(customTitle, message, data);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification?.data || {};
  event.waitUntil(openFromNotification(data));
});
