const checkers = new Set();

/** Uygulama güncellemesi / yenileme öncesi kullanıcı meşgul mü? */
export function registerAppBusyChecker(checker) {
  checkers.add(checker);
  return () => checkers.delete(checker);
}

export function isAppBusy() {
  for (const checker of checkers) {
    try {
      if (checker()) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}
