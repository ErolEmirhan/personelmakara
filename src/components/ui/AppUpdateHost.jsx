import { useEffect, useState } from 'react';
import { AppUpdateOverlay } from './AppUpdateOverlay';
import {
  APP_UPDATING_EVENT,
  APP_UPDATING_KEY,
} from '../../pwa/updateSplash';

const POST_MIGRATE_HIDE_MS = 2000;
const OVERLAY_SAFETY_HIDE_MS = 45_000;

export function AppUpdateHost() {
  const [visible, setVisible] = useState(false);
  const [awaitingReload, setAwaitingReload] = useState(false);

  useEffect(() => {
    let hideTimer = null;
    let safetyTimer = null;

    try {
      if (sessionStorage.getItem(APP_UPDATING_KEY) === '1') {
        sessionStorage.removeItem(APP_UPDATING_KEY);
        setVisible(true);
        const onBootComplete = () => setVisible(false);
        window.addEventListener('makara-boot-complete', onBootComplete, { once: true });
        hideTimer = window.setTimeout(() => setVisible(false), POST_MIGRATE_HIDE_MS);
      }
    } catch {
      /* ignore */
    }

    const onUpdating = () => {
      setAwaitingReload(true);
      setVisible(true);
    };

    window.addEventListener(APP_UPDATING_EVENT, onUpdating);

    safetyTimer = window.setTimeout(() => {
      setVisible(false);
      setAwaitingReload(false);
    }, OVERLAY_SAFETY_HIDE_MS);

    return () => {
      window.removeEventListener(APP_UPDATING_EVENT, onUpdating);
      if (hideTimer) clearTimeout(hideTimer);
      if (safetyTimer) clearTimeout(safetyTimer);
    };
  }, []);

  if (!visible) return null;

  return <AppUpdateOverlay isReloadPending={awaitingReload} />;
}
