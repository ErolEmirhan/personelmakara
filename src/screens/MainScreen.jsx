import { useEffect, useState } from 'react';
import { useBranch } from '../context/BranchContext';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { startStaffPresence, stopStaffPresence } from '../services/firebaseService';
import {
  getPushPermissionState,
  isPushConfiguredForBranch,
  requestPushOnAppEntry,
} from '../services/pushNotifications';
import { AppHeader } from '../components/layout/AppHeader';
import { BottomNav } from '../components/layout/BottomNav';
import { QuickActionsBottomSheet } from '../components/layout/QuickActionsBottomSheet';
import { Drawer } from '../components/layout/Drawer';
import { Cart } from '../components/layout/Cart';
import { TableScreen } from '../components/tables/TableScreen';
import { OrderScreen } from '../components/order/OrderScreen';
import { OrdersScreen } from './OrdersScreen';
import { NotificationsScreen } from './NotificationsScreen';
import { SettingsScreen } from './SettingsScreen';
import { BroadcastModal } from '../components/modals/BroadcastModal';
import { useAndroidBackNavigation, useBackHandler } from '../hooks/useBackButton';
import { MAIN_TABS, MAIN_CONTENT_TOP_PADDING } from '../constants/nav';
import { shouldShowBroadcast } from '../utils/notificationPrefs';

export function MainScreen() {
  const { theme, branchKey } = useBranch();
  const { staff } = useAuth();
  const { screen, mainTab, loadData, setMainTab, showToast } = useApp();
  const [broadcast, setBroadcast] = useState(null);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);

  useAndroidBackNavigation({ accountOpen: quickActionsOpen, setAccountOpen: setQuickActionsOpen });
  useBackHandler(!!broadcast, () => setBroadcast(null));

  useEffect(() => {
    if (staff && branchKey) loadData();
  }, [staff, branchKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!staff || !branchKey) return;
    startStaffPresence(staff, branchKey);
    return () => stopStaffPresence(true);
  }, [staff, branchKey]);

  useEffect(() => {
    if (!staff?.id || !branchKey || !isPushConfiguredForBranch(branchKey)) return undefined;

    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'notifications') {
      setMainTab(MAIN_TABS.NOTIFICATIONS);
      window.history.replaceState({}, '', window.location.pathname);
    }

    let cancelled = false;
    (async () => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      if (cancelled) return;

      const permission = await getPushPermissionState();
      if (permission === 'denied') return;

      await requestPushOnAppEntry(branchKey, staff.id);
    })();

    const onSwMessage = (event) => {
      if (event.data?.type === 'OPEN_NOTIFICATIONS') {
        setMainTab(MAIN_TABS.NOTIFICATIONS);
      }
    };
    navigator.serviceWorker?.addEventListener('message', onSwMessage);

    const onPushMessage = (event) => {
      const detail = event.detail || {};
      showToast('info', detail.title || 'Bildirim', detail.body || '');
      setMainTab(MAIN_TABS.NOTIFICATIONS);
    };
    window.addEventListener('makara-push-message', onPushMessage);

    return () => {
      cancelled = true;
      navigator.serviceWorker?.removeEventListener('message', onSwMessage);
      window.removeEventListener('makara-push-message', onPushMessage);
    };
  }, [staff?.id, branchKey, setMainTab, showToast]);

  useEffect(() => {
    const handler = (e) => {
      if (staff?.id && !shouldShowBroadcast(staff.id)) return;
      setBroadcast(e.detail);
    };
    window.addEventListener('makara-broadcast', handler);
    return () => window.removeEventListener('makara-broadcast', handler);
  }, [staff?.id]);

  const showBottomNav = screen !== 'order';

  const renderContent = () => {
    if (mainTab === MAIN_TABS.TABLES) {
      return screen === 'tables' ? <TableScreen /> : <OrderScreen />;
    }
    if (mainTab === MAIN_TABS.ORDERS) return <OrdersScreen />;
    if (mainTab === MAIN_TABS.NOTIFICATIONS) return <NotificationsScreen />;
    if (mainTab === MAIN_TABS.OTHER) return <SettingsScreen />;
    return <TableScreen />;
  };

  return (
    <div className={`min-h-dvh bg-gray-50 ${theme.isSultan ? 'theme-sultan' : ''}`}>
      <AppHeader />
      <main style={{ paddingTop: MAIN_CONTENT_TOP_PADDING }}>
        {renderContent()}
      </main>
      {showBottomNav && (
        <BottomNav
          accountOpen={quickActionsOpen}
          onAccountOpen={() => setQuickActionsOpen(true)}
        />
      )}
      <QuickActionsBottomSheet open={quickActionsOpen} onClose={() => setQuickActionsOpen(false)} />
      <Cart />
      <Drawer />
      <BroadcastModal
        open={!!broadcast}
        onClose={() => setBroadcast(null)}
        message={broadcast?.message}
        date={broadcast?.date}
        time={broadcast?.time}
      />
    </div>
  );
}
