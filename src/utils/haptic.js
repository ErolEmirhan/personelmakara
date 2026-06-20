/** Hafif dokunsal geri bildirim — destekleyen cihazlarda titreşim. */
export function hapticLight() {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(12);
    }
  } catch {
    /* sessizce geç */
  }
}

export function hapticSuccess() {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([10, 40, 10]);
    }
  } catch {
    /* sessizce geç */
  }
}
