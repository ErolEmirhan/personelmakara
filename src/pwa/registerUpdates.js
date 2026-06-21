import { registerSW } from 'virtual:pwa-register';

/** Açık PWA'da yeni deploy'u yakalamak için SW kontrol aralığı */
const UPDATE_INTERVAL_MS = 30_000;

function scheduleUpdateChecks(registration) {
  const check = () => {
    registration.update().catch(() => {});
  };

  window.setInterval(check, UPDATE_INTERVAL_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check();
  });

  window.addEventListener('focus', check);
  window.addEventListener('online', check);
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
        window.location.reload();
      },
    });
  } catch (error) {
    console.warn('Service worker başlatılamadı:', error);
  }
}
