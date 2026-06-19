import { useEffect, useId, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { MAIN_TABS } from '../constants/nav';

/** Açık panel/modal varken geri tuşunda çalışır */
export function useBackHandler(active, onBack) {
  const { registerBackHandler } = useApp();
  const id = useId();
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!active) return undefined;
    return registerBackHandler(id, () => {
      onBackRef.current();
      return true;
    });
  }, [active, id, registerBackHandler]);
}

/** Android geri tuşunu uygulama içi gezinmeye yönlendirir */
export function useAndroidBackNavigation({ accountOpen, setAccountOpen } = {}) {
  const {
    drawerOpen,
    setDrawerOpen,
    screen,
    mainTab,
    setMainTab,
    goBackToTables,
    runBackHandlers,
  } = useApp();

  useEffect(() => {
    const trapHistory = () => {
      try {
        history.pushState({ makaraNav: true }, '');
      } catch {
        /* ignore */
      }
    };

    const onPopState = () => {
      if (runBackHandlers()) {
        trapHistory();
        return;
      }
      if (accountOpen && setAccountOpen) {
        setAccountOpen(false);
        trapHistory();
        return;
      }
      if (drawerOpen) {
        setDrawerOpen(false);
        trapHistory();
        return;
      }
      if (screen === 'order') {
        goBackToTables();
        trapHistory();
        return;
      }
      if (mainTab !== MAIN_TABS.TABLES) {
        setMainTab(MAIN_TABS.TABLES);
        trapHistory();
        return;
      }
      trapHistory();
    };

    trapHistory();
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [
    accountOpen,
    setAccountOpen,
    drawerOpen,
    setDrawerOpen,
    screen,
    mainTab,
    setMainTab,
    goBackToTables,
    runBackHandlers,
  ]);
}
