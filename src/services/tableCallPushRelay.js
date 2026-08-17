import { subscribeTableCalls } from './firebaseService';
import {
  isPushConfiguredForBranch,
  notifyTableCallLocally,
  notifyTableCallPush,
} from './pushNotifications';

const relayProcessed = new Set();

function formatTableCallLabel(tableNumber) {
  const label = tableNumber != null && String(tableNumber).trim() !== ''
    ? String(tableNumber).trim()
    : '?';
  return `MASA ${label} Garson Çağırıyor`;
}

/**
 * makara-16344 / tablecalls dinler; anında yerel uyarı + FCM push gönderir.
 */
export function startTableCallPushRelay(branchKey) {
  if (!branchKey) {
    return () => {};
  }

  if (!isPushConfiguredForBranch(branchKey)) {
    console.warn('[table-call] Push bu şube için yapılandırılmamış:', branchKey);
    return () => {};
  }

  return subscribeTableCalls(async (call) => {
    if (!call?.id || relayProcessed.has(call.id)) return;

    relayProcessed.add(call.id);

    const tableNumber = call.tableNumber;
    const message = formatTableCallLabel(tableNumber);

    try {
      console.info('[table-call] Yeni çağrı algılandı', {
        callId: call.id,
        source: call.source,
        tableNumber,
        status: call.status,
      });

      notifyTableCallLocally({ tableNumber, callId: call.id, message });

      const result = await notifyTableCallPush({
        branchKey,
        tableNumber,
        callId: call.id,
        message,
      });

      console.info('[table-call] FCM push sonucu', {
        callId: call.id,
        sent: result?.sent ?? 0,
        failed: result?.failed ?? 0,
      });
    } catch (err) {
      console.error('[table-call] Push relay hatası (yerel uyarı gönderildi):', err);
    }
  });
}

export { formatTableCallLabel };
