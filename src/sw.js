/* eslint-disable no-undef */
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

importScripts(
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js'
);

firebase.initializeApp({
  apiKey: 'AIzaSyCdf-c13e0wCafRYHXhIls1epJgD1RjPUA',
  authDomain: 'makara-16344.firebaseapp.com',
  projectId: 'makara-16344',
  storageBucket: 'makara-16344.firebasestorage.app',
  messagingSenderId: '216769654742',
  appId: '1:216769654742:web:16792742d4613f4269be77',
});

function parsePushPayload(payload) {
  const data = payload?.data || {};
  return {
    title:
      payload?.notification?.title ||
      data.title ||
      'MAKARA · Ekip bildirimi',
    body: payload?.notification?.body || data.body || '',
    data,
  };
}

function showPushNotification(title, body, data) {
  const icon = new URL('icons/icon-192.png', self.location.origin).href;
  const tag = data?.announcementId
    ? `makara-announcement-${data.announcementId}`
    : 'makara-staff-announcement';
  return self.registration.showNotification(title, {
    body,
    icon,
    badge: icon,
    tag,
    data,
  });
}

firebase.messaging().onBackgroundMessage((payload) => {
  const { title, body, data } = parsePushPayload(payload);
  return showPushNotification(title, body, data);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        client.postMessage({ type: 'OPEN_NOTIFICATIONS' });
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/?tab=notifications');
      return undefined;
    })
  );
});
