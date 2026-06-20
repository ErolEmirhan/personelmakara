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

firebase.messaging().onBackgroundMessage((payload) => {
  const title =
    payload.notification?.title ||
    payload.data?.title ||
    'MAKARA · Ekip bildirimi';
  const body =
    payload.notification?.body ||
    payload.data?.body ||
    '';

  return self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'makara-staff-announcement',
    data: payload.data || {},
  });
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
