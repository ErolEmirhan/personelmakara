const STORAGE_KEY = 'makara_notification_prefs';

export const DEFAULT_NOTIFICATION_PREFS = {
  broadcasts: true,
  orderUpdates: true,
  teamOnline: true,
};

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadNotificationPrefs(staffId) {
  if (!staffId) return { ...DEFAULT_NOTIFICATION_PREFS };
  const all = readAll();
  return { ...DEFAULT_NOTIFICATION_PREFS, ...all[String(staffId)] };
}

export function saveNotificationPrefs(staffId, prefs) {
  if (!staffId) return;
  const all = readAll();
  all[String(staffId)] = { ...DEFAULT_NOTIFICATION_PREFS, ...prefs };
  writeAll(all);
}

export function shouldShowBroadcast(staffId) {
  return loadNotificationPrefs(staffId).broadcasts;
}

export function shouldShowOrderUpdates(staffId) {
  return loadNotificationPrefs(staffId).orderUpdates;
}

export function shouldShowTeamOnline(staffId) {
  return loadNotificationPrefs(staffId).teamOnline;
}
