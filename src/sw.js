/* eslint-disable no-undef */
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import { BRANCH_FIREBASE } from './config/firebase';

self.skipWaiting();
clientsClaim();

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
  const tag = data?.ticketId
    ? `makara-support-${data.ticketId}`
    : data?.announcementId
      ? `makara-announcement-${data.announcementId}`
      : 'makara-staff-announcement';
  return self.registration.showNotification(title, {
    body,
    icon,
    badge: icon,
    tag,
    data: { ...data, title: customTitle, body: message },
  });
}

function openFromNotification(data) {
  const isSupport = data?.type === 'staff_support';
  const ticketId = data?.ticketId || '';
  const base = self.location.pathname.replace(/\/[^/]*$/, '/') || '/';
  const openPath = isSupport && ticketId
    ? `${base}?open=support&ticket=${encodeURIComponent(ticketId)}`
    : `${base}?tab=notifications`;

  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
    for (const client of windowClients) {
      client.postMessage({
        type: isSupport ? 'OPEN_SUPPORT' : 'OPEN_NOTIFICATIONS',
        ticketId: ticketId || undefined,
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
