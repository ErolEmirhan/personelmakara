import { shouldProcessPushEvent } from './pushEventDedup';

let cachedSrc = null;
let audioContext = null;
let unlocked = false;
let preloadAudio = null;
let unlockListenersAttached = false;

const ENABLED_KEY = 'makara_table_call_sound_enabled';
const DISMISSED_KEY = 'makara_table_call_sound_dismissed';

export function isTableCallPushData(data = {}) {
  if (data.type === 'table_call') return true;
  const id = String(data.announcementId || data.callId || '');
  return id.startsWith('tablecall-');
}

export function isOrderCallPushData(data = {}) {
  return data.type === 'order_call';
}

export function isOperationalPushData(data = {}) {
  return isTableCallPushData(data) || isOrderCallPushData(data);
}

function readStaffMap(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStaffFlag(key, staffId, value) {
  if (!staffId) return;
  const map = readStaffMap(key);
  map[String(staffId)] = value;
  localStorage.setItem(key, JSON.stringify(map));
}

export function isTableCallSoundEnabled(staffId) {
  if (!staffId) return false;
  return readStaffMap(ENABLED_KEY)[String(staffId)] === true;
}

export function isTableCallSoundPromptDismissed(staffId) {
  if (!staffId) return false;
  return readStaffMap(DISMISSED_KEY)[String(staffId)] === true;
}

export function dismissTableCallSoundPrompt(staffId) {
  writeStaffFlag(DISMISSED_KEY, staffId, true);
}

export function resetTableCallSoundPromptDismiss(staffId) {
  writeStaffFlag(DISMISSED_KEY, staffId, false);
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

function playWebAudioChime({ volume = 0.38 } = {}) {
  const ctx = getAudioContext();
  if (!ctx) return false;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
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

function playFileSound(volume = 0.85) {
  if (!preloadAudio) {
    preloadAudio = new Audio(getSoundSrc());
    preloadAudio.preload = 'auto';
  }

  const clip = preloadAudio.cloneNode();
  clip.volume = volume;
  return clip.play();
}

function runSound({ volume = 0.85 } = {}) {
  playWebAudioChime({ volume: Math.min(volume, 0.45) });
  return playFileSound(volume);
}

/** İlk dokunuş / bildirim izni sonrası mobil ses kilidini aç */
export function unlockTableCallSound() {
  if (typeof window === 'undefined' || unlocked) return;

  try {
    const ctx = getAudioContext();
    if (ctx?.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

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

/** Kullanıcı dokunuşu ile sesi aç + test çal */
export async function enableTableCallSoundWithTest(staffId) {
  if (!staffId) return { ok: false, reason: 'no_staff' };

  unlockTableCallSound();

  const ctx = getAudioContext();
  if (ctx?.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      /* devam */
    }
  }

  try {
    await runSound({ volume: 0.9 });
    writeStaffFlag(ENABLED_KEY, staffId, true);
    writeStaffFlag(DISMISSED_KEY, staffId, false);
    unlocked = true;
    return { ok: true };
  } catch {
    writeStaffFlag(ENABLED_KEY, staffId, true);
    unlocked = true;
    return { ok: true, reason: 'played_fallback' };
  }
}

/** Garson çağrısı / masa siparişi — kısa bildirim sesi */
export function playTableCallSound(staffId, eventKey = null) {
  if (typeof window === 'undefined') return;
  if (staffId && !isTableCallSoundEnabled(staffId)) return;

  if (eventKey && !shouldProcessPushEvent(`sound:${eventKey}`)) return;

  runSound()?.catch(() => {});
}

attachTableCallSoundUnlock();
