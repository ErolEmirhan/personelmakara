import { useEffect } from 'react';
import { subscribeNewTableCalls, subscribeNewOrderCalls } from '../services/firebaseService';
import { shouldShowOrderUpdates, shouldShowTableCalls } from '../utils/notificationPrefs';
import { pushEventKey, shouldProcessPushEvent } from '../utils/pushEventDedup';
import { playTableCallSound } from '../utils/tableCallSound';
import { hapticLight } from '../utils/haptic';

function emitOperationalAlert(detail) {
  window.dispatchEvent(new CustomEvent('makara-operational-alert', { detail }));
}

/**
 * Firestore kaynaklı gerçek garson çağrısı / masa siparişi olayları.
 * Push ile çift ses/toast olmaması için dedup anahtarı paylaşılır.
 */
export function useOperationalAlerts({ branchKey, staffId, enabled = true }) {
  useEffect(() => {
    if (!enabled || !branchKey || !staffId) return undefined;

    const unsubs = [];

    if (shouldShowTableCalls(staffId)) {
      unsubs.push(
        subscribeNewTableCalls(branchKey, (call) => {
          const key = pushEventKey('table_call', call.id);
          if (!shouldProcessPushEvent(key)) return;

          hapticLight();
          playTableCallSound(staffId, key);
          emitOperationalAlert({
            kind: 'table_call',
            title: 'Garson çağrısı',
            body: `MASA ${call.tableNumber ?? '?'} garson istiyor`,
            callId: call.id,
            tableNumber: call.tableNumber,
          });
        })
      );
    }

    if (shouldShowOrderUpdates(staffId)) {
      unsubs.push(
        subscribeNewOrderCalls(branchKey, (orderCall) => {
          const key = pushEventKey('order_call', orderCall.id);
          if (!shouldProcessPushEvent(key)) return;

          hapticLight();
          playTableCallSound(staffId, key);
          emitOperationalAlert({
            kind: 'order_call',
            title: 'Masa siparişi',
            body: `MASA ${orderCall.tableNumber ?? '?'} sipariş verdi`,
            orderCallId: orderCall.id,
            tableNumber: orderCall.tableNumber,
          });
        })
      );
    }

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [branchKey, staffId, enabled]);
}
