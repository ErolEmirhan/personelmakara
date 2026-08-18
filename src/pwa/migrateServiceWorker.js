import { hardReloadWithCacheBust } from './serviceWorkerClient';
import { fetchRemoteBuildVersion, readLocalBuildVersion as readMetaBuildVersion } from './buildVersion';

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

function resolveAppVersion(fallbackVersion) {
  return readMetaBuildVersion() || fallbackVersion || 'unknown';
}

async function purgeAllCaches() {
  if (!('caches' in window)) return;
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

async function unregisterAllServiceWorkers() {
  if (!('serviceWorker' in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((reg) => reg.unregister()));
}

function stripRecoveryParams(url) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('reset-sw');
    parsed.searchParams.delete('_makara_v');
    return parsed.toString();
  } catch {
    return url.split('?')[0];
  }
}

/**
 * Eski /mobile/ SW, sürüm sıçraması veya reset-sw ile bozuk önbellek — tam sıfırlama.
 * Normal deploy'lar network-first shell + soft reload ile hallolur (registerUpdates).
 */
export async function migrateServiceWorkerCache(fallbackVersion) {
  if (!('serviceWorker' in navigator)) {
    writeStoredVersion(resolveAppVersion(fallbackVersion));
    return;
  }

  const forceReset = new URLSearchParams(window.location.search).get('reset-sw') === '1';
  if (forceReset) {
    await unregisterAllServiceWorkers();
    await purgeAllCaches();
    writeStoredVersion(resolveAppVersion(fallbackVersion));
    return;
  }

  const appVersion = resolveAppVersion(fallbackVersion);
  const previousVersion = readStoredVersion();
  const versionChanged = previousVersion && previousVersion !== appVersion;

  let remoteVersion = null;
  try {
    remoteVersion = await fetchRemoteBuildVersion();
  } catch {
    /* offline */
  }

  const localMetaVersion = readMetaBuildVersion();
  const remoteMismatch = remoteVersion && localMetaVersion && remoteVersion !== localMetaVersion;
  const storedMismatch = remoteVersion && previousVersion && remoteVersion !== previousVersion;

  const registrations = await navigator.serviceWorker.getRegistrations();
  const isRootDeploy = !window.location.pathname.startsWith('/mobile');
  const hasLegacyScope = registrations.some((reg) => {
    const scopePath = new URL(reg.scope).pathname;
    return isRootDeploy && scopePath.includes('/mobile');
  });

  const shouldReset = versionChanged || remoteMismatch || storedMismatch || hasLegacyScope;
  if (!shouldReset) {
    writeStoredVersion(remoteVersion || appVersion);
    return;
  }

  try {
    const active = registrations.find((r) => r.active)?.active;
    if (active) {
      active.postMessage({ type: 'PURGE_CACHES' });
    }
  } catch {
    /* ignore */
  }

  await unregisterAllServiceWorkers();
  await purgeAllCaches();
  writeStoredVersion(remoteVersion || appVersion);

  try {
    if (!sessionStorage.getItem(MIGRATION_RELOAD_KEY)) {
      sessionStorage.setItem(MIGRATION_RELOAD_KEY, '1');
      hardReloadWithCacheBust();
      return;
    }
    sessionStorage.removeItem(MIGRATION_RELOAD_KEY);
    window.location.replace(stripRecoveryParams(window.location.href));
  } catch {
    hardReloadWithCacheBust();
  }
}
