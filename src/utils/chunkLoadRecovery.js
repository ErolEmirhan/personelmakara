import { signalAppUpdating } from '../pwa/updateSplash';

const CHUNK_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /Loading chunk [\w-]+ failed/i,
  /error loading dynamically imported module/i,
];

const RESET_DELAY_MS = 2400;

export function isChunkLoadError(message) {
  if (!message) return false;
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export function redirectToCacheReset() {
  signalAppUpdating();
  const url = new URL(window.location.href);
  if (!url.searchParams.has('reset-sw')) {
    url.searchParams.set('reset-sw', '1');
  }
  window.setTimeout(() => {
    window.location.replace(url.toString());
  }, RESET_DELAY_MS);
}

export function installChunkLoadRecovery() {
  const onError = (event) => {
    const message = event?.message || event?.reason?.message || String(event?.reason || '');
    if (isChunkLoadError(message)) {
      redirectToCacheReset();
    }
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onError);

  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onError);
  };
}
