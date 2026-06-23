import { startTransition, useEffect, useId, useRef } from 'react';
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

function scheduleHistoryTrap() {
  queueMicrotask(() => {
    requestAnimationFrame(() => {
      try {
        const url = `${window.location.pathname}${window.location.search}`;
        history.pushState({ makaraNav: true }, '', url);
      } catch {
        /* ignore */
      }
    });
  });
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

  const navRef = useRef({
    accountOpen,
    setAccountOpen,
    drawerOpen,
    setDrawerOpen,
    screen,
    mainTab,
    setMainTab,
    goBackToTables,
    runBackHandlers,
  });

  navRef.current = {
    accountOpen,
    setAccountOpen,
    drawerOpen,
    setDrawerOpen,
    screen,
    mainTab,
    setMainTab,
    goBackToTables,
    runBackHandlers,
  };

  useEffect(() => {
    const onPopState = () => {
      const nav = navRef.current;

      if (nav.runBackHandlers()) {
        scheduleHistoryTrap();
        return;
      }

      if (nav.accountOpen && nav.setAccountOpen) {
        startTransition(() => nav.setAccountOpen(false));
        scheduleHistoryTrap();
        return;
      }

      if (nav.drawerOpen) {
        startTransition(() => nav.setDrawerOpen(false));
        scheduleHistoryTrap();
        return;
      }

      if (nav.screen === 'order') {
        startTransition(() => nav.goBackToTables());
        scheduleHistoryTrap();
        return;
      }

      if (nav.mainTab !== MAIN_TABS.TABLES) {
        startTransition(() => nav.setMainTab(MAIN_TABS.TABLES));
        scheduleHistoryTrap();
        return;
      }

      scheduleHistoryTrap();
    };

    try {
      const url = `${window.location.pathname}${window.location.search}`;
      history.replaceState({ makaraNav: true }, '', url);
      history.pushState({ makaraNav: true }, '', url);
    } catch {
      /* ignore */
    }

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
}
