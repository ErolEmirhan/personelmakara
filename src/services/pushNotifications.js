import { getApps } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';

const VAPID_BY_BRANCH = {
  makara: import.meta.env.VITE_FCM_VAPID_KEY_MAKARA,
};

const PUSH_REGISTERED_KEY = 'makara_push_registered';
const PUSH_ENTRY_PROMPT_KEY = 'makara_push_entry_prompted';

let foregroundHandlerAttached = false;

function apiUrl(path) {
  const root = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  return `${root}${path.replace(/^\//, '')}`;
}

export function isPushConfiguredForBranch(branchKey) {
  return branchKey === 'makara' && !!VAPID_BY_BRANCH.makara;
}

export function isPushRegisteredLocally(staffId) {
  if (!staffId) return false;
  try {
    return localStorage.getItem(PUSH_REGISTERED_KEY) === String(staffId);
  } catch {
    return false;
  }
}

function markPushRegistered(staffId) {
  try {
    localStorage.setItem(PUSH_REGISTERED_KEY, String(staffId));
  } catch {
    /* ignore */
  }
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

async function waitForServiceWorkerRegistration() {
  const scope = import.meta.env.BASE_URL || '/';

  if (!navigator.serviceWorker.controller) {
    await new Promise((resolve) => {
      const timeout = window.setTimeout(resolve, 8000);
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.clearTimeout(timeout);
        resolve();
      }, { once: true });
    });
  }

  let registration = await navigator.serviceWorker.getRegistration(scope);

  if (!registration) {
    await navigator.serviceWorker.ready;
    registration = await navigator.serviceWorker.getRegistration(scope);
  }

  if (!registration) {
    throw new Error('Service worker kaydı bulunamadı — uygulamayı ana ekrandan açın');
  }

  if (!registration.active) {
    await new Promise((resolve) => {
      const worker = registration.installing || registration.waiting;
      if (!worker) {
        resolve();
        return;
      }
      const onState = () => {
        if (worker.state === 'activated') {
          worker.removeEventListener('statechange', onState);
          resolve();
        }
      };
      worker.addEventListener('statechange', onState);
      setTimeout(resolve, 12_000);
    });
  }

  return registration;
}

async function persistPushToken(branchKey, staffId, token) {
  const res = await fetch(apiUrl('api/register-push-token'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ branchKey, staffId, token }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Push token sunucuya kaydedilemedi');
  }
  return data;
}

export function pushRegistrationErrorMessage(reason, err) {
  switch (reason) {
    case 'unsupported_branch':
      return 'Push bu şube için yapılandırılmamış (VAPID key eksik olabilir).';
    case 'unsupported':
      return 'Bu cihaz veya tarayıcı push bildirimini desteklemiyor.';
    case 'denied':
      return 'Bildirim izni reddedildi. Telefon ayarlarından açın.';
    case 'firebase_not_ready':
      return 'Firebase henüz hazır değil — uygulamayı yeniden açın.';
    case 'no_token':
      return 'FCM token alınamadı — uygulamayı kapatıp ana ekrandan tekrar açın.';
    case 'not_granted':
      return 'Bildirim izni verilmemiş.';
    default:
      return err?.message || 'Push kaydı yapılamadı';
  }
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

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') {
    return { ok: false, reason: 'denied', permission };
  }

  const app = getMainApp();
  if (!app) {
    return { ok: false, reason: 'firebase_not_ready' };
  }

  try {
    const registration = await waitForServiceWorkerRegistration();
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: VAPID_BY_BRANCH[branchKey],
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      return { ok: false, reason: 'no_token' };
    }

    await persistPushToken(branchKey, staffId, token);
    markPushRegistered(staffId);
    attachForegroundMessageHandler(messaging);

    return { ok: true, permission, token };
  } catch (err) {
    console.error('registerStaffPushNotifications:', err);
    return { ok: false, reason: 'error', error: err };
  }
}

export async function syncStaffPushToken(branchKey, staffId) {
  if ((await getPushPermissionState()) !== 'granted') {
    return { ok: false, reason: 'not_granted' };
  }
  return registerStaffPushNotifications(branchKey, staffId);
}

/** Uygulama açılışında izin henüz sorulmadıysa bildirim izni ister ve cihazı kaydeder */
export async function requestPushOnAppEntry(branchKey, staffId) {
  if (!staffId || !isPushConfiguredForBranch(branchKey)) {
    return { ok: false, reason: 'unsupported_branch' };
  }

  if (!(await isPushSupported())) {
    return { ok: false, reason: 'unsupported' };
  }

  const permission = Notification.permission;

  if (permission === 'denied') {
    return { ok: false, reason: 'denied', permission };
  }

  if (permission === 'granted') {
    if (!isPushRegisteredLocally(staffId)) {
      return registerStaffPushNotifications(branchKey, staffId);
    }
    return syncStaffPushToken(branchKey, staffId);
  }

  try {
    if (sessionStorage.getItem(PUSH_ENTRY_PROMPT_KEY)) {
      return { ok: false, reason: 'already_prompted' };
    }
    sessionStorage.setItem(PUSH_ENTRY_PROMPT_KEY, '1');
  } catch {
    /* ignore */
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

export async function fetchPushRegistrationStatus(branchKey, staffId) {
  const res = await fetch(apiUrl('api/push-status'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ branchKey, staffId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Push durumu alınamadı');
  }
  return data;
}

export async function sendAnnouncementPush({ branchKey, staffId, title, message, announcementId }) {
  const res = await fetch(apiUrl('api/push-announcement'), {
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
