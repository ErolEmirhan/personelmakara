import { getApps } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import {
  fetchAdminPushTokens,
  fetchBranchPushTokens,
  getStaffPushRegistrationStatus,
  pruneInvalidPushTokens,
  saveStaffPushToken,
  fetchStaffPushTokens,
} from './firebaseService';
import { formatPushNotificationDisplay } from '../utils/pushDisplayFormat';
import { supportCategoryLabel } from '../constants/supportTickets';

const VAPID_BY_BRANCH = {
  makara: import.meta.env.VITE_FCM_VAPID_KEY_MAKARA,
};

const PUSH_REGISTERED_KEY = 'makara_push_registered';
const PUSH_TOKEN_KEY = 'makara_push_fcm_token';
const PUSH_STATUS_CHECK_KEY = 'makara_push_status_checked_at';
const PUSH_STATUS_CHECK_COOLDOWN_MS = 6 * 60 * 60 * 1000;

let foregroundHandlerAttached = false;
let pushPromptInFlight = false;

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

function markPushRegistered(staffId, token) {
  try {
    localStorage.setItem(PUSH_REGISTERED_KEY, String(staffId));
    if (token) {
      localStorage.setItem(PUSH_TOKEN_KEY, JSON.stringify({ staffId: String(staffId), token }));
    }
  } catch {
    /* ignore */
  }
}

function getStoredPushToken(staffId) {
  if (!staffId) return null;
  try {
    const raw = localStorage.getItem(PUSH_TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.staffId !== String(staffId)) return null;
    return parsed.token || null;
  } catch {
    return null;
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
  const result = await saveStaffPushToken(staffId, branchKey, token);
  if (!result?.success) {
    throw new Error('Push token Firestore\'a kaydedilemedi');
  }
  return result;
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
    case 'already_synced':
      return '';
    default:
      return err?.message || 'Push kaydı yapılamadı';
  }
}

export async function getPushPermissionState() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function registerStaffPushNotifications(branchKey, staffId, { forceSync = false } = {}) {
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

    const storedToken = getStoredPushToken(staffId);
    const alreadySynced = isPushRegisteredLocally(staffId) && storedToken === token;

    if (alreadySynced && !forceSync) {
      attachForegroundMessageHandler(messaging);
      return { ok: true, permission, token, reason: 'already_synced' };
    }

    await persistPushToken(branchKey, staffId, token);
    markPushRegistered(staffId, token);
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

  if (isPushRegisteredLocally(staffId) && getStoredPushToken(staffId)) {
    ensureForegroundPushHandler();
    return { ok: true, reason: 'already_synced' };
  }

  return registerStaffPushNotifications(branchKey, staffId);
}

/** Uygulama açılışında bildirim izni henüz verilmediyse hemen sorar ve cihazı kaydeder */
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
    ensureForegroundPushHandler();
    if (isPushRegisteredLocally(staffId) && getStoredPushToken(staffId)) {
      return { ok: true, reason: 'already_synced', permission };
    }
    return registerStaffPushNotifications(branchKey, staffId);
  }

  if (pushPromptInFlight) {
    return { ok: false, reason: 'in_flight' };
  }

  pushPromptInFlight = true;
  try {
    return await registerStaffPushNotifications(branchKey, staffId);
  } finally {
    pushPromptInFlight = false;
  }
}

function attachForegroundMessageHandler(messaging) {
  if (foregroundHandlerAttached) return;
  foregroundHandlerAttached = true;

  onMessage(messaging, (payload) => {
    const customTitle = payload.notification?.title || payload.data?.title || 'MAKARA';
    const message = payload.notification?.body || payload.data?.body || '';
    const data = payload.data || {};

    window.dispatchEvent(
      new CustomEvent('makara-push-message', {
        detail: { title: customTitle, body: message, data },
      })
    );

    if (document.visibilityState !== 'visible') {
      showLocalNotification(customTitle, message, data);
    }
  });
}

function showLocalNotification(customTitle, message, data = {}) {
  if (typeof window === 'undefined' || Notification.permission !== 'granted') return;

  const { title, body } = formatPushNotificationDisplay(customTitle, message);
  const base = import.meta.env.BASE_URL || '/';
  const icon = new URL('icons/icon-192.png', `${window.location.origin}${base}`).href;
  const tag = data?.ticketId
    ? `makara-support-${data.ticketId}`
    : data?.announcementId
      ? `makara-announcement-${data.announcementId}`
      : 'makara-staff-announcement';

  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((registration) => {
          registration.showNotification(title, {
            body,
            icon,
            badge: icon,
            tag,
            data: { ...data, title: customTitle, body: message },
          });
        })
        .catch(() => {
          new Notification(title, { body, icon, tag, data });
        });
      return;
    }
    new Notification(title, { body, icon, tag, data });
  } catch {
    /* iOS PWA ön planda sistem bildirimi engelleyebilir */
  }
}

export function ensureForegroundPushHandler() {
  const app = getMainApp();
  if (!app || Notification.permission !== 'granted') return;
  try {
    attachForegroundMessageHandler(getMessaging(app));
  } catch (err) {
    console.warn('ensureForegroundPushHandler:', err);
  }
}

export async function fetchPushRegistrationStatus(branchKey, staffId) {
  if (isPushRegisteredLocally(staffId) && getStoredPushToken(staffId)) {
    try {
      const lastCheck = Number(sessionStorage.getItem(PUSH_STATUS_CHECK_KEY) || 0);
      if (Date.now() - lastCheck < PUSH_STATUS_CHECK_COOLDOWN_MS) {
        return { staffRegistered: true, cached: true };
      }
    } catch {
      /* ignore */
    }
  }

  const status = await getStaffPushRegistrationStatus(staffId);

  try {
    sessionStorage.setItem(PUSH_STATUS_CHECK_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }

  if (status.staffRegistered) {
    markPushRegistered(staffId, getStoredPushToken(staffId));
  }

  return status;
}

export async function sendAnnouncementPush({ branchKey, staffId, title, message, announcementId }) {
  const tokens = await fetchBranchPushTokens(branchKey);

  const res = await fetch(apiUrl('api/push-announcement'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      branchKey,
      staffId,
      title,
      message,
      announcementId,
      tokens,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Push API hatası');
  }

  if (data.invalidTokens?.length) {
    await pruneInvalidPushTokens(branchKey, data.invalidTokens).catch(() => {});
  }

  return data;
}

export async function notifySupportMessagePush({
  branchKey,
  ticketId,
  category,
  messageText,
  senderStaffId,
  senderIsAdmin,
  senderName,
  recipientStaffId,
  hasImage = false,
}) {
  if (!isPushConfiguredForBranch(branchKey)) return { sent: 0 };

  let tokens = [];
  if (senderIsAdmin) {
    if (recipientStaffId != null) {
      tokens = await fetchStaffPushTokens(recipientStaffId);
    }
  } else {
    tokens = await fetchAdminPushTokens(branchKey);
  }

  const senderTokens = await fetchStaffPushTokens(senderStaffId);
  const exclude = new Set(senderTokens);
  tokens = [...new Set(tokens)].filter((t) => !exclude.has(t));

  if (!tokens.length) return { sent: 0 };

  const categoryLabel = supportCategoryLabel(category);
  const title = senderIsAdmin
    ? 'Destek · Admin yanıtı'
    : `Destek · ${(senderName || 'Personel').trim()}`;
  const headline = senderIsAdmin ? title : `${title} · ${categoryLabel}`;
  const preview = (messageText || '').trim();
  const message = preview
    ? (hasImage && !preview.includes('📷') ? `${preview} · 📷 Görsel` : preview)
    : '📷 Görsel';
  const body = message.length > 160 ? `${message.slice(0, 157)}…` : message;

  const res = await fetch(apiUrl('api/push-announcement'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      branchKey,
      title: headline,
      message: body,
      tokens,
      pushType: 'staff_support',
      ticketId,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Push API hatası');
  }

  if (data.invalidTokens?.length) {
    await pruneInvalidPushTokens(branchKey, data.invalidTokens).catch(() => {});
  }

  return data;
}

export async function notifySupportResolvedPush({
  branchKey,
  ticketId,
  category,
  resolverStaffId,
  ticketStaffId,
  resolvedByName,
}) {
  if (!isPushConfiguredForBranch(branchKey)) return { sent: 0 };

  const tokens = new Set();
  for (const token of await fetchStaffPushTokens(ticketStaffId)) tokens.add(token);
  for (const token of await fetchAdminPushTokens(branchKey)) tokens.add(token);

  const resolverTokens = await fetchStaffPushTokens(resolverStaffId);
  const exclude = new Set(resolverTokens);
  const targetTokens = [...tokens].filter((t) => !exclude.has(t));

  if (!targetTokens.length) return { sent: 0 };

  const categoryLabel = supportCategoryLabel(category);
  const title = `Destek · ${categoryLabel}`;
  const message = resolvedByName ? `${resolvedByName}\nÇözüldü` : 'Çözüldü';

  const res = await fetch(apiUrl('api/push-announcement'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      branchKey,
      title,
      message,
      tokens: targetTokens,
      pushType: 'staff_support',
      ticketId,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Push API hatası');
  }

  if (data.invalidTokens?.length) {
    await pruneInvalidPushTokens(branchKey, data.invalidTokens).catch(() => {});
  }

  return data;
}
