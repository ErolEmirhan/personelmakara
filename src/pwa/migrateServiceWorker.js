import { signalAppUpdating } from './updateSplash';

const APP_VERSION_KEY = 'makara-app-version';
const MIGRATION_RELOAD_KEY = 'makara-cache-migrated';

function readStoredVersion() {
  try {
    return localStorage.getItem(APP_VERSION_KEY);
  } catch {
    return null;
  }
}

function writeStoredVersion(version) {
  try {
    localStorage.setItem(APP_VERSION_KEY, version);
  } catch {
    /* iOS gizli sekme / depolama kapalı */
  }
}

function readBuildVersionFromDom() {
  const meta = document.querySelector('meta[name="makara-build"]');
  return meta?.getAttribute('content') || null;
}

function resolveAppVersion(fallbackVersion) {
  return readBuildVersionFromDom() || fallbackVersion || 'unknown';
}

/** Eski /mobile/ SW veya sürüm değişiminde bozuk PWA önbelleğini temizler */
export async function migrateServiceWorkerCache(fallbackVersion) {
  if (!('serviceWorker' in navigator)) {
    writeStoredVersion(resolveAppVersion(fallbackVersion));
    return;
  }

  const appVersion = resolveAppVersion(fallbackVersion);
  const forceReset = new URLSearchParams(window.location.search).get('reset-sw') === '1';
  const previousVersion = readStoredVersion();
  const versionChanged = previousVersion && previousVersion !== appVersion;

  const registrations = await navigator.serviceWorker.getRegistrations();
  const isRootDeploy = !window.location.pathname.startsWith('/mobile');
  const hasLegacyScope = registrations.some((reg) => {
    const scopePath = new URL(reg.scope).pathname;
    return isRootDeploy && scopePath.includes('/mobile');
  });

  const shouldReset = forceReset || versionChanged || hasLegacyScope;
  if (!shouldReset) {
    writeStoredVersion(appVersion);
    return;
  }

  await Promise.all(registrations.map((reg) => reg.unregister()));

  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }

  writeStoredVersion(appVersion);

  try {
    if (!sessionStorage.getItem(MIGRATION_RELOAD_KEY)) {
      sessionStorage.setItem(MIGRATION_RELOAD_KEY, '1');
      signalAppUpdating();
      window.location.replace(stripResetParam(window.location.href));
      return;
    }
    sessionStorage.removeItem(MIGRATION_RELOAD_KEY);
  } catch {
    signalAppUpdating();
    window.location.replace(stripResetParam(window.location.href));
  }
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
