import { registerSW } from 'virtual:pwa-register';
import { redirectToCacheReset } from '../utils/chunkLoadRecovery';
import { isAppBusy } from '../utils/appBusy';
import { signalAppUpdating } from './updateSplash';

/** SW güncelleme kontrolü — çok sık tetiklenmesin */
const SW_UPDATE_INTERVAL_MS = 5 * 60 * 1000;
/** Aynı oturumda art arda yenileme üst sınırı */
const RELOAD_COOLDOWN_MS = 90_000;
/** Meşgul kullanıcı (sepet dolu vb.) için yeniden deneme */
const BUSY_RETRY_MS = 15_000;
/** Uzak build ile uyumsuzluk deneme limiti (sonsuz döngü koruması) */
const MAX_BUILD_MISMATCH_ATTEMPTS = 2;

const LAST_RELOAD_AT_KEY = 'makara-last-reload-at';
const BUILD_MISMATCH_KEY = 'makara-build-mismatch-attempts';

let reloadScheduled = false;
let updateOverlayShown = false;

function readLocalBuildVersion() {
  return document.querySelector('meta[name="makara-build"]')?.getAttribute('content') || null;
}

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

function clearSessionKey(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function canScheduleReload() {
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

function scheduleReload() {
  if (!canScheduleReload()) return;
  showUpdateOverlayOnce();

  const attempt = () => {
    if (isAppBusy()) {
      window.setTimeout(attempt, BUSY_RETRY_MS);
      return;
    }
    reloadScheduled = true;
    writeSessionNumber(LAST_RELOAD_AT_KEY, Date.now());
    redirectToCacheReset();
  };

  attempt();
}

async function checkRemoteBuildVersion() {
  const local = readLocalBuildVersion();
  if (!local) return;

  const attempts = readSessionNumber(BUILD_MISMATCH_KEY);
  if (attempts >= MAX_BUILD_MISMATCH_ATTEMPTS) return;

  try {
    const base = import.meta.env.BASE_URL || '/';
    const url = new URL('index.html', `${window.location.origin}${base}`);
    url.searchParams.set('makara-build-check', String(Date.now()));
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) return;
    const html = await res.text();
    const match = html.match(/name=["']makara-build["']\s+content=["']([^"']+)["']/i);
    const remote = match?.[1];
    if (remote && remote !== local) {
      writeSessionNumber(BUILD_MISMATCH_KEY, attempts + 1);
      scheduleReload();
      return;
    }
    if (remote === local) {
      clearSessionKey(BUILD_MISMATCH_KEY);
    }
  } catch {
    /* çevrimdışı */
  }
}

function scheduleUpdateChecks(registration) {
  const checkSwUpdate = () => {
    registration.update().catch(() => {});
  };

  const checkBuildWhenVisible = () => {
    checkRemoteBuildVersion();
  };

  // İlk SW kontrolü hemen; build karşılaştırması biraz gecikmeli (açılışta yanlış alarm olmasın)
  checkSwUpdate();
  window.setTimeout(checkBuildWhenVisible, 45_000);

  window.setInterval(checkSwUpdate, SW_UPDATE_INTERVAL_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkSwUpdate();
      checkBuildWhenVisible();
    }
  });

  window.addEventListener('focus', () => {
    checkSwUpdate();
    checkBuildWhenVisible();
  });

  window.addEventListener('online', checkSwUpdate);

  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    if (!worker) return;

    worker.addEventListener('statechange', () => {
      if (worker.state !== 'installed') return;
      if (!navigator.serviceWorker.controller) return;
      scheduleReload();
    });
  });
}

/** Başarılı açılış — build uyumsuzluk sayacını sıfırla */
export function markPwaUpdateSettled() {
  clearSessionKey(BUILD_MISMATCH_KEY);
  updateOverlayShown = false;
  reloadScheduled = false;
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
        scheduleReload();
      },
    });
  } catch (error) {
    console.warn('Service worker başlatılamadı:', error);
  }
}
