import { claimTableCallPushNotification, subscribeTableCalls } from './firebaseService';
import { isPushConfiguredForBranch, notifyTableCallPush } from './pushNotifications';

const relayProcessed = new Set();

function formatTableCallLabel(tableNumber) {
  const label = tableNumber != null && String(tableNumber).trim() !== ''
    ? String(tableNumber).trim()
    : '?';
  return `MASA ${label} Garson Çağırıyor`;
}

/**
 * QR menüden gelen garson çağrılarını dinler; yeni çağrıda tüm şube personeline push gönderir.
 * En az bir personelin PWA'sı açık olmalıdır (Firestore dinleyicisi).
 */
export function startTableCallPushRelay(branchKey) {
  if (!branchKey || !isPushConfiguredForBranch(branchKey)) {
    return () => {};
  }

  return subscribeTableCalls(async (call) => {
    if (!call?.id || relayProcessed.has(call.id)) return;

    relayProcessed.add(call.id);

    try {
      const claimed = await claimTableCallPushNotification(call.id);
      if (!claimed) return;

      const tableNumber = call.tableNumber;
      const message = formatTableCallLabel(tableNumber);

      await notifyTableCallPush({
        branchKey,
        tableNumber,
        callId: call.id,
        message,
      });
    } catch (err) {
      console.error('startTableCallPushRelay:', err);
      relayProcessed.delete(call.id);
    }
  });
}
