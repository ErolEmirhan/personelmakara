import { signalAppUpdating } from '../pwa/updateSplash';

const CHUNK_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /Failed to load module script/i,
  /Loading chunk [\w-]+ failed/i,
  /Loading CSS chunk [\w-]+ failed/i,
  /error loading dynamically imported module/i,
  /ChunkLoadError/i,
  /Unable to preload CSS/i,
  /Unexpected token '<'/,
  /Unexpected token \{/,
  /is not a valid JavaScript MIME type/i,
  /MIME type.*text\/html/i,
];

const RESET_DELAY_MS = 2400;
let recoveryScheduled = false;

export function isChunkLoadError(message) {
  if (!message) return false;
  const text = String(message);
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(text));
}

export function isRecoverableDeployError(error) {
  const message = error?.message || String(error || '');
  if (isChunkLoadError(message)) return true;
  if (error?.name === 'ChunkLoadError') return true;
  return false;
}

export function redirectToCacheReset(options = {}) {
  const { immediate = false } = options;
  if (recoveryScheduled) return;
  recoveryScheduled = true;
  signalAppUpdating();
  const url = new URL(window.location.href);
  url.searchParams.set('reset-sw', '1');
  url.searchParams.set('_makara_v', String(Date.now()));
  const delay = immediate ? 400 : RESET_DELAY_MS;
  window.setTimeout(() => {
    window.location.replace(url.toString());
  }, delay);
}

function extractErrorMessage(event) {
  if (event?.reason) {
    return event.reason?.message || String(event.reason);
  }
  if (event?.error?.message) return event.error.message;
  return event?.message || '';
}

export function installChunkLoadRecovery() {
  const onError = (event) => {
    const message = extractErrorMessage(event);
    if (isRecoverableDeployError({ message })) {
      event?.preventDefault?.();
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
