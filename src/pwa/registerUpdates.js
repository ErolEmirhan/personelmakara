import { registerSW } from 'virtual:pwa-register';
import { redirectToCacheReset } from '../utils/chunkLoadRecovery';
import { isAppBusy } from '../utils/appBusy';
import { signalAppUpdating } from './updateSplash';

/** Açık PWA'da yeni deploy'u yakalamak için kontrol aralığı */
const UPDATE_INTERVAL_MS = 12_000;
/** Meşgul kullanıcı için yeniden deneme aralığı */
const BUSY_RETRY_MS = 8000;

let reloadScheduled = false;
let hadServiceWorkerController = false;

function readLocalBuildVersion() {
  return document.querySelector('meta[name="makara-build"]')?.getAttribute('content') || null;
}

function scheduleReload() {
  if (reloadScheduled) return;
  signalAppUpdating();

  const attempt = () => {
    if (isAppBusy()) {
      window.setTimeout(attempt, BUSY_RETRY_MS);
      return;
    }
    reloadScheduled = true;
    redirectToCacheReset();
  };

  attempt();
}

async function checkRemoteBuildVersion() {
  const local = readLocalBuildVersion();
  if (!local) return;

  try {
    const base = import.meta.env.BASE_URL || '/';
    const url = new URL(`index.html`, `${window.location.origin}${base}`);
    url.searchParams.set('makara-build-check', String(Date.now()));
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) return;
    const html = await res.text();
    const match = html.match(/name=["']makara-build["']\s+content=["']([^"']+)["']/i);
    const remote = match?.[1];
    if (remote && remote !== local) {
      scheduleReload();
    }
  } catch {
    /* çevrimdışı */
  }
}

function scheduleUpdateChecks(registration) {
  const check = () => {
    registration.update().catch(() => {});
    checkRemoteBuildVersion();
  };

  check();
  window.setInterval(check, UPDATE_INTERVAL_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check();
  });

  window.addEventListener('focus', check);
  window.addEventListener('online', check);

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

function installServiceWorkerListeners() {
  if (!('serviceWorker' in navigator)) return;

  hadServiceWorkerController = !!navigator.serviceWorker.controller;

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'MAKARA_SW_ACTIVATED') {
      scheduleReload();
    }
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadServiceWorkerController) {
      hadServiceWorkerController = true;
      return;
    }
    scheduleReload();
  });
}

export function initPwaUpdates() {
  if (!('serviceWorker' in navigator)) return;

  installServiceWorkerListeners();

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
