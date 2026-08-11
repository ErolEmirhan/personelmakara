const ERROR_KEY = 'makara_last_app_error';

export function persistAppError(error) {
  try {
    const payload = {
      message: error?.message || String(error),
      stack: error?.stack || null,
      at: new Date().toISOString(),
      href: window.location.href,
    };
    sessionStorage.setItem(ERROR_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function readLastAppError() {
  try {
    const raw = sessionStorage.getItem(ERROR_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
