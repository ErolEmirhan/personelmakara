import { signalAppUpdating, consumeAppUpdatingFlag } from './updateSplash';

const SW_URL = `${import.meta.env.BASE_URL || '/'}sw.js`.replace(/([^:]\/)\/+/g, '$1');
const SW_SCOPE = import.meta.env.BASE_URL || '/';

function isUpdatePending() {
  try {
    return sessionStorage.getItem('makara-app-updating') === '1';
  } catch {
    return false;
  }
}

/** iOS bfcache / donmuş shell'i aşmak için cache-bust reload */
export function hardReloadWithCacheBust() {
  signalAppUpdating();
  const url = new URL(window.location.href);
  url.searchParams.delete('reset-sw');
  url.searchParams.set('_makara_v', String(Date.now()));
  window.location.replace(url.toString());
}

export async function registerAppServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;

  return navigator.serviceWorker.register(SW_URL, {
    scope: SW_SCOPE,
    updateViaCache: 'none',
    type: 'module',
  });
}

/** iOS standalone: sayfadan SKIP_WAITING gönder, yeni SW'nin devreye girmesini bekle */
export async function activateWaitingServiceWorker(registration, timeoutMs = 4000) {
  if (!registration?.waiting) return false;

  const activated = new Promise((resolve) => {
    const timeout = window.setTimeout(resolve, timeoutMs);
    const onChange = () => {
      window.clearTimeout(timeout);
      navigator.serviceWorker.removeEventListener('controllerchange', onChange);
      resolve();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onChange, { once: true });
  });

  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  await activated;
  return true;
}

export async function checkForWaitingUpdate(registration) {
  if (!registration) return false;
  await registration.update().catch(() => {});
  if (!registration.waiting) return false;

  signalAppUpdating();
  await activateWaitingServiceWorker(registration);

  await new Promise((resolve) => {
    window.setTimeout(resolve, 1800);
  });

  if (isUpdatePending()) {
    hardReloadWithCacheBust();
  }
  return true;
}

let controllerReloadInstalled = false;

/** Yeni SW devreye girince — yalnızca biz güncelleme başlattıysak reload */
export function installControllerChangeReload() {
  if (controllerReloadInstalled || !('serviceWorker' in navigator)) return;
  controllerReloadInstalled = true;

  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded || !isUpdatePending()) return;
    reloaded = true;
    consumeAppUpdatingFlag();
    const url = new URL(window.location.href);
    url.searchParams.delete('reset-sw');
    url.searchParams.set('_makara_v', String(Date.now()));
    window.location.replace(url.toString());
  });
}

/** iOS: visibilitychange kaçırılırsa pageshow(persisted) ile güncelleme kontrolü */
export function installIosResumeUpdateCheck(onCheck) {
  if (!('serviceWorker' in navigator)) return;

  const runCheck = () => {
    navigator.serviceWorker.getRegistration(SW_SCOPE).then((reg) => {
      if (reg) onCheck(reg);
    }).catch(() => {});
  };

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) runCheck();
  });

  window.addEventListener('focus', runCheck);
}
