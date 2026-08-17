let cachedSrc = null;

export function isTableCallPushData(data = {}) {
  if (data.type === 'table_call') return true;
  const id = String(data.announcementId || data.callId || '');
  return id.startsWith('tablecall-');
}

function getSoundSrc() {
  if (cachedSrc) return cachedSrc;
  const base = import.meta.env.BASE_URL || '/';
  cachedSrc = new URL('sounds/table-call.wav', `${window.location.origin}${base}`).href;
  return cachedSrc;
}

/** Garson çağrısı — kısa çift ton bildirim sesi */
export function playTableCallSound() {
  if (typeof window === 'undefined') return;

  try {
    const audio = new Audio(getSoundSrc());
    audio.volume = 0.82;
    audio.play().catch(() => {});
  } catch {
    /* sessizce geç */
  }
}
