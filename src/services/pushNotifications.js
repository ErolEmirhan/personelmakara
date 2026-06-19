import { getApps } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { saveStaffPushToken } from './firebaseService';

const VAPID_BY_BRANCH = {
  makara: import.meta.env.VITE_FCM_VAPID_KEY_MAKARA,
};

const SW_PATH = '/firebase-messaging-sw.js';
const SW_SCOPE = '/';

let foregroundHandlerAttached = false;

export function isPushConfiguredForBranch(branchKey) {
  return branchKey === 'makara' && !!VAPID_BY_BRANCH.makara;
}

export async function isPushSupported() {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return false;
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

function getMainApp() {
  return getApps().find((app) => app.name === 'main') || getApps()[0] || null;
}

async function ensureMessagingServiceWorker() {
  const existing = await navigator.serviceWorker.getRegistration(SW_SCOPE);
  if (existing?.active?.scriptURL?.includes('firebase-messaging-sw.js')) {
    return existing;
  }
  return navigator.serviceWorker.register(SW_PATH, { scope: SW_SCOPE });
}

export async function getPushPermissionState() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function registerStaffPushNotifications(branchKey, staffId) {
  if (!staffId || !isPushConfiguredForBranch(branchKey)) {
    return { ok: false, reason: 'unsupported_branch' };
  }

  if (!(await isPushSupported())) {
    return { ok: false, reason: 'unsupported' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, reason: 'denied', permission };
  }

  const app = getMainApp();
  if (!app) {
    return { ok: false, reason: 'firebase_not_ready' };
  }

  const registration = await ensureMessagingServiceWorker();
  await navigator.serviceWorker.ready;

  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey: VAPID_BY_BRANCH[branchKey],
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    return { ok: false, reason: 'no_token' };
  }

  await saveStaffPushToken(staffId, branchKey, token);
  attachForegroundMessageHandler(messaging);

  return { ok: true, permission, token };
}

export async function syncStaffPushToken(branchKey, staffId) {
  if ((await getPushPermissionState()) !== 'granted') {
    return { ok: false, reason: 'not_granted' };
  }
  return registerStaffPushNotifications(branchKey, staffId);
}

function attachForegroundMessageHandler(messaging) {
  if (foregroundHandlerAttached) return;
  foregroundHandlerAttached = true;

  onMessage(messaging, (payload) => {
    const title = payload.notification?.title || payload.data?.title || 'MAKARA';
    const body = payload.notification?.body || payload.data?.body || '';
    window.dispatchEvent(
      new CustomEvent('makara-push-message', {
        detail: { title, body, data: payload.data || {} },
      })
    );
  });
}

export async function sendAnnouncementPush({ branchKey, staffId, title, message, announcementId }) {
  const res = await fetch('/api/push-announcement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      branchKey,
      staffId,
      title,
      message,
      announcementId,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Push API hatası');
  }
  return data;
}
