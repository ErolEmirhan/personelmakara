const APP_VERSION_KEY = 'makara-app-version';
const MIGRATION_RELOAD_KEY = 'makara-cache-migrated';

/** Eski /mobile/ SW veya sürüm değişiminde bozuk PWA önbelleğini temizler */
export async function migrateServiceWorkerCache(appVersion) {
  if (!('serviceWorker' in navigator)) return;

  const forceReset = new URLSearchParams(window.location.search).get('reset-sw') === '1';
  const previousVersion = localStorage.getItem(APP_VERSION_KEY);
  const versionChanged = previousVersion && previousVersion !== appVersion;

  const registrations = await navigator.serviceWorker.getRegistrations();
  const isRootDeploy = !window.location.pathname.startsWith('/mobile');
  const hasLegacyScope = registrations.some((reg) => {
    const scopePath = new URL(reg.scope).pathname;
    return isRootDeploy && scopePath.includes('/mobile');
  });

  const shouldReset = forceReset || versionChanged || hasLegacyScope;
  if (!shouldReset) {
    localStorage.setItem(APP_VERSION_KEY, appVersion);
    return;
  }

  await Promise.all(registrations.map((reg) => reg.unregister()));

  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }

  localStorage.setItem(APP_VERSION_KEY, appVersion);

  if (!sessionStorage.getItem(MIGRATION_RELOAD_KEY)) {
    sessionStorage.setItem(MIGRATION_RELOAD_KEY, '1');
    window.location.replace(stripResetParam(window.location.href));
    return;
  }

  sessionStorage.removeItem(MIGRATION_RELOAD_KEY);
}

function stripResetParam(url) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('reset-sw');
    return parsed.toString();
  } catch {
    return url.split('?')[0];
  }
}
