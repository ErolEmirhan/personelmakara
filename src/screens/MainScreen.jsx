import { useEffect, useState } from 'react';
import { useBranch } from '../context/BranchContext';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { startStaffPresence, stopStaffPresence } from '../services/firebaseService';
import {
  isPushConfiguredForBranch,
  requestPushOnAppEntry,
} from '../services/pushNotifications';
import { hapticLight } from '../utils/haptic';
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
import { PendingCartModal } from '../components/modals/PendingCartModal';
import { TableCallSoundPrompt } from '../components/notifications/TableCallSoundPrompt';
import { BranchSurface } from '../components/ui/BranchSurface';
import { ScreenTransition } from '../components/ui/ScreenTransition';
import { useAndroidBackNavigation, useBackHandler } from '../hooks/useBackButton';
import { useOperationalAlerts } from '../hooks/useOperationalAlerts';
import { MAIN_TABS, MAIN_CONTENT_TOP_PADDING } from '../constants/nav';
import { ORDERS_VIEWS } from '../components/orders/OrdersViewSwitch';
import { shouldShowBroadcast, shouldShowOrderUpdates, shouldShowTableCalls } from '../utils/notificationPrefs';
import { pushEventKey, shouldProcessPushEvent } from '../utils/pushEventDedup';
import {
  dismissTableCallSoundPrompt,
  isOrderCallPushData,
  isTableCallPushData,
  isTableCallSoundEnabled,
  isTableCallSoundPromptDismissed,
  playTableCallSound,
} from '../utils/tableCallSound';

function resolvePushEventKey(data = {}) {
  if (isTableCallPushData(data)) {
    const callId = data.callId || String(data.announcementId || '').replace(/^tablecall-/, '');
    return pushEventKey('table_call', callId);
  }
  if (isOrderCallPushData(data)) {
    return pushEventKey('order_call', data.orderCallId);
  }
  return '';
}

export function MainScreen() {
  const { theme, branchKey } = useBranch();
  const { staff } = useAuth();
  const {
    screen,
    mainTab,
    loadData,
    setMainTab,
    showBriefToast,
    openTableByNumber,
    setOrdersViewRequest,
    pendingCartPrompt,
    dismissPendingCartPrompt,
  } = useApp();
  const [broadcast, setBroadcast] = useState(null);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [soundPromptOpen, setSoundPromptOpen] = useState(false);

  useOperationalAlerts({
    branchKey,
    staffId: staff?.id,
    enabled: !!staff?.id && !!branchKey,
  });

  useAndroidBackNavigation({ accountOpen: quickActionsOpen, setAccountOpen: setQuickActionsOpen });
  useBackHandler(!!broadcast, () => setBroadcast(null));
  useBackHandler(!!pendingCartPrompt, dismissPendingCartPrompt);

  useEffect(() => {
    if (staff && branchKey) loadData();
  }, [staff, branchKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!staff || !branchKey) return;
    startStaffPresence(staff, branchKey);
    return () => stopStaffPresence(true);
  }, [staff, branchKey]);

  const handleOperationalAlert = (detail) => {
    if (!detail?.kind) return;

    if (detail.kind === 'table_call' && staff?.id && !shouldShowTableCalls(staff.id)) return;
    if (detail.kind === 'order_call' && staff?.id && !shouldShowOrderUpdates(staff.id)) return;

    showBriefToast('info', detail.title, detail.body);
  };

  const handlePushData = (data, title, body) => {
    if (data.type === 'staff_support') {
      return { kind: 'support', title: title || 'Destek mesajı', body: body || '', ticketId: data.ticketId || null };
    }

    const eventKey = resolvePushEventKey(data);
    if (eventKey && !shouldProcessPushEvent(eventKey)) {
      return null;
    }

    if (isTableCallPushData(data)) {
      if (staff?.id && !shouldShowTableCalls(staff.id)) return null;
      playTableCallSound(staff?.id, eventKey);
      hapticLight();
      showBriefToast('info', title || 'Garson çağrısı', body || '');
      return {
        kind: 'table_call',
        title: title || 'Garson çağrısı',
        body: body || '',
        callId: data.callId || null,
        tableNumber: data.tableNumber || null,
      };
    }

    if (isOrderCallPushData(data)) {
      if (staff?.id && !shouldShowOrderUpdates(staff.id)) return null;
      playTableCallSound(staff?.id, eventKey);
      hapticLight();
      showBriefToast('info', title || 'Masa siparişi', body || '');
      return { kind: 'order_call' };
    }

    showBriefToast('info', title || 'Bildirim', body || '');
    return { kind: 'notification' };
  };

  useEffect(() => {
    if (!staff?.id || !branchKey || !isPushConfiguredForBranch(branchKey)) return undefined;

    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'notifications') {
      setMainTab(MAIN_TABS.NOTIFICATIONS);
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('tab') === 'tables') {
      setMainTab(MAIN_TABS.TABLES);
      const tableNumber = params.get('table');
      if (tableNumber) {
        openTableByNumber(tableNumber);
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('tab') === 'orders') {
      setMainTab(MAIN_TABS.ORDERS);
      const ordersView = params.get('view');
      if (ordersView === 'order_calls') {
        setOrdersViewRequest(ORDERS_VIEWS.ORDER_CALLS);
      } else if (ordersView === 'table_calls') {
        setOrdersViewRequest(ORDERS_VIEWS.TABLE_CALLS);
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('open') === 'support') {
      window.dispatchEvent(
        new CustomEvent('makara-open-support', {
          detail: { ticketId: params.get('ticket') || null },
        })
      );
      window.history.replaceState({}, '', window.location.pathname);
    }

    let cancelled = false;
    (async () => {
      if ('serviceWorker' in navigator) {
        await Promise.race([
          navigator.serviceWorker.ready,
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ]);
      }
      if (cancelled) return;
      await requestPushOnAppEntry(branchKey, staff.id);
    })();

    const onSwMessage = (event) => {
      if (event.data?.type === 'OPEN_NOTIFICATIONS') {
        setMainTab(MAIN_TABS.NOTIFICATIONS);
      }
      if (event.data?.type === 'OPEN_TABLES') {
        setMainTab(MAIN_TABS.TABLES);
        if (event.data.tableNumber) {
          openTableByNumber(event.data.tableNumber);
        }
      }
      if (event.data?.type === 'OPEN_ORDERS') {
        setMainTab(MAIN_TABS.ORDERS);
        if (event.data.ordersView === 'order_calls') {
          setOrdersViewRequest(ORDERS_VIEWS.ORDER_CALLS);
        } else if (event.data.ordersView === 'table_calls') {
          setOrdersViewRequest(ORDERS_VIEWS.TABLE_CALLS);
        }
      }
      if (event.data?.type === 'OPEN_SUPPORT') {
        window.dispatchEvent(
          new CustomEvent('makara-open-support', {
            detail: { ticketId: event.data.ticketId || null },
          })
        );
      }
    };
    navigator.serviceWorker?.addEventListener('message', onSwMessage);

    const onPushMessage = (event) => {
      const detail = event.detail || {};
      const data = detail.data || {};
      handlePushData(data, detail.title, detail.body);
    };
    window.addEventListener('makara-push-message', onPushMessage);

    const onOperationalAlert = (event) => {
      handleOperationalAlert(event.detail || {});
    };
    window.addEventListener('makara-operational-alert', onOperationalAlert);

    return () => {
      cancelled = true;
      navigator.serviceWorker?.removeEventListener('message', onSwMessage);
      window.removeEventListener('makara-push-message', onPushMessage);
      window.removeEventListener('makara-operational-alert', onOperationalAlert);
    };
  }, [staff?.id, branchKey, setMainTab, showBriefToast, openTableByNumber, setOrdersViewRequest]);

  useEffect(() => {
    if (!staff?.id || !branchKey || !isPushConfiguredForBranch(branchKey)) return undefined;

    const retryIfNeeded = () => {
      if (document.visibilityState !== 'visible') return;
      if (Notification.permission !== 'default') return;
      requestPushOnAppEntry(branchKey, staff.id);
    };

    document.addEventListener('visibilitychange', retryIfNeeded);
    return () => document.removeEventListener('visibilitychange', retryIfNeeded);
  }, [staff?.id, branchKey]);

  useEffect(() => {
    const handler = (e) => {
      if (staff?.id && !shouldShowBroadcast(staff.id)) return;
      setBroadcast(e.detail);
    };
    window.addEventListener('makara-broadcast', handler);
    return () => window.removeEventListener('makara-broadcast', handler);
  }, [staff?.id]);

  useEffect(() => {
    if (!staff?.id || !shouldShowTableCalls(staff.id)) {
      setSoundPromptOpen(false);
      return;
    }
    if (isTableCallSoundEnabled(staff.id)) {
      setSoundPromptOpen(false);
      return;
    }
    setSoundPromptOpen(!isTableCallSoundPromptDismissed(staff.id));
  }, [staff?.id]);

  const showBottomNav = screen !== 'order';

  const renderContent = () => {
    if (mainTab === MAIN_TABS.TABLES) {
      return (
        <ScreenTransition screenKey={screen}>
          {screen === 'tables' ? <TableScreen /> : <OrderScreen />}
        </ScreenTransition>
      );
    }
    if (mainTab === MAIN_TABS.ORDERS) return <OrdersScreen />;
    if (mainTab === MAIN_TABS.NOTIFICATIONS) return <NotificationsScreen />;
    if (mainTab === MAIN_TABS.OTHER) return <SettingsScreen />;
    return <TableScreen />;
  };

  return (
    <div className={`relative min-h-dvh ${theme.isSultan ? 'theme-sultan' : ''}`}>
      <BranchSurface />
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
      <PendingCartModal />
      <TableCallSoundPrompt
        staffId={staff?.id}
        open={soundPromptOpen}
        onEnabled={() => setSoundPromptOpen(false)}
        onDismiss={() => {
          if (staff?.id) dismissTableCallSoundPrompt(staff.id);
          setSoundPromptOpen(false);
        }}
      />
    </div>
  );
}
