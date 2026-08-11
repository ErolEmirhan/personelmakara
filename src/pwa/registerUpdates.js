import { registerSW } from 'virtual:pwa-register';
import { redirectToCacheReset } from '../utils/chunkLoadRecovery';
import { isAppBusy } from '../utils/appBusy';
import { signalAppUpdating } from './updateSplash';
import {
  compareBuildVersions,
  fetchRemoteBuildVersion,
  isRemoteBuildNewer,
  readLocalBuildVersion,
} from './buildVersion';

/** SW güncelleme kontrolü */
const SW_UPDATE_INTERVAL_MS = 2 * 60 * 1000;
/** Aynı oturumda art arda yenileme üst sınırı (build zorlaması hariç) */
const RELOAD_COOLDOWN_MS = 90_000;
/** Meşgul kullanıcı için yeniden deneme aralığı */
const BUSY_RETRY_MS = 8_000;
/** Meşgul iken en fazla bekleme denemesi, sonra yine de yenile */
const BUSY_MAX_RETRIES = 12;
/** İlk build kontrolü — boot tamamlandıktan sonra */
const INITIAL_BUILD_CHECK_MS = 2_000;
/** Yedek build kontrolü */
const FOLLOWUP_BUILD_CHECK_MS = 12_000;

const LAST_RELOAD_AT_KEY = 'makara-last-reload-at';

let reloadScheduled = false;
let updateOverlayShown = false;

function readSessionNumber(key) {
  try {
    return Number(sessionStorage.getItem(key) || 0);
  } catch {
    return 0;
  }
}

function writeSessionNumber(key, value) {
  try {
    sessionStorage.setItem(key, String(value));
  } catch {
    /* ignore */
  }
}

function canScheduleReload({ force = false } = {}) {
  if (force) return !reloadScheduled;
  if (reloadScheduled) return false;
  const lastReloadAt = readSessionNumber(LAST_RELOAD_AT_KEY);
  if (lastReloadAt && Date.now() - lastReloadAt < RELOAD_COOLDOWN_MS) return false;
  return true;
}

function showUpdateOverlayOnce() {
  if (updateOverlayShown) return;
  updateOverlayShown = true;
  signalAppUpdating();
}

function scheduleReload(options = {}) {
  const { force = false, immediate = false, reason = 'sw' } = options;
  if (!canScheduleReload({ force })) return;
  showUpdateOverlayOnce();

  const attempt = (busyRetries = 0) => {
    const busy = isAppBusy();
    const shouldForceDespiteBusy =
      force && reason === 'build' && busyRetries >= BUSY_MAX_RETRIES;

    if (busy && !shouldForceDespiteBusy) {
      window.setTimeout(() => attempt(busyRetries + 1), BUSY_RETRY_MS);
      return;
    }

    reloadScheduled = true;
    writeSessionNumber(LAST_RELOAD_AT_KEY, Date.now());
    redirectToCacheReset({ immediate });
  };

  attempt();
}

async function checkRemoteBuildVersion(options = {}) {
  const { force = false } = options;
  const local = readLocalBuildVersion();
  if (!local) return { updateAvailable: false, local, remote: null };

  const remote = await fetchRemoteBuildVersion();
  if (isRemoteBuildNewer(local, remote)) {
    scheduleReload({ force: true, immediate: force, reason: 'build' });
    return { updateAvailable: true, local, remote };
  }

  return { updateAvailable: false, local, remote };
}

function scheduleUpdateChecks(registration) {
  const checkSwUpdate = () => {
    registration.update().catch(() => {});
  };

  const checkBuild = (opts) => {
    checkRemoteBuildVersion(opts).catch(() => {});
  };

  checkSwUpdate();
  window.setTimeout(() => checkBuild({ force: false }), INITIAL_BUILD_CHECK_MS);
  window.setTimeout(() => checkBuild({ force: false }), FOLLOWUP_BUILD_CHECK_MS);

  window.setInterval(checkSwUpdate, SW_UPDATE_INTERVAL_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkSwUpdate();
      checkBuild({ force: false });
    }
  });

  window.addEventListener('focus', () => {
    checkSwUpdate();
    checkBuild({ force: false });
  });

  window.addEventListener('online', () => {
    checkSwUpdate();
    checkBuild({ force: false });
  });

  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    if (!worker) return;

    worker.addEventListener('statechange', () => {
      if (worker.state !== 'installed') return;
      if (!navigator.serviceWorker.controller) return;
      scheduleReload({ force: false, reason: 'sw' });
    });
  });
}

/** Başarılı açılış */
export function markPwaUpdateSettled() {
  updateOverlayShown = false;
  reloadScheduled = false;
}

/** Ayarlar ekranı — güncelleme var mı kontrol et */
export async function checkForAppUpdate() {
  return compareBuildVersions();
}

/** Ayarlar ekranı — kullanıcı tetiklemeli güncelleme */
export function forcePwaRefresh() {
  reloadScheduled = false;
  writeSessionNumber(LAST_RELOAD_AT_KEY, 0);
  scheduleReload({ force: true, immediate: true, reason: 'build' });
}

export function initPwaUpdates() {
  if (!('serviceWorker' in navigator)) return;

  try {
    registerSW({
      immediate: true,
      onRegisteredSW(_swUrl, registration) {
        if (registration) scheduleUpdateChecks(registration);
      },
      onRegisterError(error) {
        console.warn('Service worker kaydı başarısız:', error);
      },
      onOfflineReady() {},
      onNeedRefresh() {
        scheduleReload({ force: false, reason: 'sw' });
      },
    });
  } catch (error) {
    console.warn('Service worker başlatılamadı:', error);
  }
}
