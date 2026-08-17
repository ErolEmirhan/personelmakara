import { redirectToCacheReset } from '../utils/chunkLoadRecovery';
import { isAppBusy } from '../utils/appBusy';
import { signalAppUpdating } from './updateSplash';
import {
  activateWaitingServiceWorker,
  checkForWaitingUpdate,
  hardReloadWithCacheBust,
  installControllerChangeReload,
  installIosResumeUpdateCheck,
  registerAppServiceWorker,
} from './serviceWorkerClient';
import {
  compareBuildVersions,
  fetchRemoteBuildVersion,
  isRemoteBuildNewer,
  readLocalBuildVersion,
} from './buildVersion';

const SW_UPDATE_INTERVAL_MS = 2 * 60 * 1000;
const RELOAD_COOLDOWN_MS = 90_000;
const BUSY_RETRY_MS = 8_000;
const BUSY_MAX_RETRIES = 12;
const INITIAL_BUILD_CHECK_MS = 2_000;
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

function markReloadScheduled() {
  reloadScheduled = true;
  writeSessionNumber(LAST_RELOAD_AT_KEY, Date.now());
}

function isUpdatePending() {
  try {
    return sessionStorage.getItem('makara-app-updating') === '1';
  } catch {
    return false;
  }
}

/** Hafif güncelleme: SW aktive et; reload controllerchange veya fallback ile */
async function applySoftUpdate(registration) {
  showUpdateOverlayOnce();
  markReloadScheduled();

  if (registration?.waiting) {
    await activateWaitingServiceWorker(registration);
    window.setTimeout(() => {
      if (isUpdatePending()) hardReloadWithCacheBust();
    }, 2200);
    return;
  }

  hardReloadWithCacheBust();
}

function scheduleSoftReload(options = {}) {
  const { force = false, registration = null } = options;
  if (!canScheduleReload({ force })) return;

  const attempt = (busyRetries = 0) => {
    const busy = isAppBusy();
    const shouldForceDespiteBusy = force && busyRetries >= BUSY_MAX_RETRIES;

    if (busy && !shouldForceDespiteBusy) {
      window.setTimeout(() => attempt(busyRetries + 1), BUSY_RETRY_MS);
      return;
    }

    applySoftUpdate(registration);
  };

  attempt();
}

/** Ağır kurtarma: chunk hatası / kullanıcı zorla yenile — tam SW sıfırlama */
function scheduleHardReset(options = {}) {
  const { force = false, immediate = false } = options;
  if (!canScheduleReload({ force })) return;
  showUpdateOverlayOnce();
  markReloadScheduled();
  redirectToCacheReset({ immediate });
}

async function checkRemoteBuildVersion(options = {}) {
  const { force = false, registration = null } = options;
  const local = readLocalBuildVersion();
  if (!local) return { updateAvailable: false, local, remote: null };

  const remote = await fetchRemoteBuildVersion();
  if (isRemoteBuildNewer(local, remote)) {
    scheduleSoftReload({ force: true, registration });
    return { updateAvailable: true, local, remote };
  }

  return { updateAvailable: false, local, remote };
}

function scheduleUpdateChecks(registration) {
  const checkSwUpdate = async () => {
    const updated = await checkForWaitingUpdate(registration);
    if (!updated) {
      await registration.update().catch(() => {});
    }
  };

  const checkBuild = (opts) => {
    checkRemoteBuildVersion({ ...opts, registration }).catch(() => {});
  };

  checkSwUpdate();
  window.setTimeout(() => checkBuild({ force: false }), INITIAL_BUILD_CHECK_MS);
  window.setTimeout(() => checkBuild({ force: false }), FOLLOWUP_BUILD_CHECK_MS);

  window.setInterval(() => {
    registration.update().catch(() => {});
  }, SW_UPDATE_INTERVAL_MS);

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

  installIosResumeUpdateCheck((reg) => {
    checkForWaitingUpdate(reg).catch(() => {});
    checkRemoteBuildVersion({ force: false, registration: reg }).catch(() => {});
  });

  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    if (!worker) return;

    worker.addEventListener('statechange', () => {
      if (worker.state !== 'installed') return;
      if (!navigator.serviceWorker.controller) return;
      scheduleSoftReload({ force: false, registration });
    });
  });
}

export function markPwaUpdateSettled() {
  updateOverlayShown = false;
  reloadScheduled = false;
}

export async function checkForAppUpdate() {
  return compareBuildVersions();
}

/** Ayarlar — kullanıcı tetiklemeli tam sıfırlama */
export function forcePwaRefresh() {
  reloadScheduled = false;
  writeSessionNumber(LAST_RELOAD_AT_KEY, 0);
  scheduleHardReset({ force: true, immediate: true });
}

export async function initPwaUpdates() {
  if (!('serviceWorker' in navigator)) return;

  installControllerChangeReload();

  try {
    const registration = await registerAppServiceWorker();
    if (registration) {
      scheduleUpdateChecks(registration);
    }
  } catch (error) {
    console.warn('Service worker başlatılamadı:', error);
  }
}
