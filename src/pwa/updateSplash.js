export const APP_UPDATING_KEY = 'makara-app-updating';
export const APP_UPDATING_EVENT = 'makara-app-updating';

/** Güncelleme splash ekranını göster (reload öncesi veya soğuk açılışta) */
export function signalAppUpdating() {
  try {
    sessionStorage.setItem(APP_UPDATING_KEY, '1');
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(APP_UPDATING_EVENT));
}

export function consumeAppUpdatingFlag() {
  try {
    const active = sessionStorage.getItem(APP_UPDATING_KEY) === '1';
    if (active) sessionStorage.removeItem(APP_UPDATING_KEY);
    return active;
  } catch {
    return false;
  }
}
