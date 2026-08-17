let cachedSrc = null;
let audioContext = null;
let unlocked = false;
let preloadAudio = null;
let unlockListenersAttached = false;

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

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioContext) audioContext = new Ctx();
  return audioContext;
}

function playWebAudioChime() {
  const ctx = getAudioContext();
  if (!ctx) return false;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.38, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

  [[784, 0], [988, 0.17]].forEach(([freq, start]) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start(now + start);
    osc.stop(now + start + 0.2);
  });

  return true;
}

function playFileSound() {
  if (!preloadAudio) {
    preloadAudio = new Audio(getSoundSrc());
    preloadAudio.preload = 'auto';
  }

  const clip = preloadAudio.cloneNode();
  clip.volume = 0.85;
  return clip.play();
}

/** İlk dokunuş / bildirim izni sonrası mobil ses kilidini aç */
export function unlockTableCallSound() {
  if (typeof window === 'undefined' || unlocked) return;

  try {
    const ctx = getAudioContext();
    if (ctx?.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    playWebAudioChime();

    if (!preloadAudio) {
      preloadAudio = new Audio(getSoundSrc());
      preloadAudio.preload = 'auto';
    }

    preloadAudio.volume = 0.01;
    const warmUp = preloadAudio.play();
    if (warmUp?.then) {
      warmUp
        .then(() => {
          preloadAudio.pause();
          preloadAudio.currentTime = 0;
          preloadAudio.volume = 0.85;
          unlocked = true;
        })
        .catch(() => {
          unlocked = true;
        });
    } else {
      unlocked = true;
    }
  } catch {
    unlocked = true;
  }
}

export function attachTableCallSoundUnlock() {
  if (typeof window === 'undefined' || unlockListenersAttached) return;
  unlockListenersAttached = true;

  const unlockOnce = () => {
    unlockTableCallSound();
    window.removeEventListener('pointerdown', unlockOnce, true);
    window.removeEventListener('keydown', unlockOnce, true);
    window.removeEventListener('touchstart', unlockOnce, true);
  };

  window.addEventListener('pointerdown', unlockOnce, { passive: true, capture: true });
  window.addEventListener('keydown', unlockOnce, { capture: true });
  window.addEventListener('touchstart', unlockOnce, { passive: true, capture: true });
}

/** Garson çağrısı — kısa çift ton bildirim sesi */
export function playTableCallSound() {
  if (typeof window === 'undefined') return;

  playWebAudioChime();

  playFileSound()?.catch(() => {
    /* dosya yüklenemezse Web Audio yeterli */
  });
}

attachTableCallSoundUnlock();
