const seen = new Map();
const DEFAULT_TTL_MS = 90_000;

/** Aynı push/çağrı olayının kısa sürede tekrar ses/toast tetiklemesini engeller */
export function shouldProcessPushEvent(key, ttlMs = DEFAULT_TTL_MS) {
  if (!key) return true;
  const now = Date.now();
  const prev = seen.get(key);
  if (prev && now - prev < ttlMs) return false;
  seen.set(key, now);

  if (seen.size > 200) {
    for (const [k, ts] of seen) {
      if (now - ts > ttlMs) seen.delete(k);
    }
  }

  return true;
}

export function pushEventKey(type, id) {
  if (!id) return '';
  return `${type}:${String(id)}`;
}
