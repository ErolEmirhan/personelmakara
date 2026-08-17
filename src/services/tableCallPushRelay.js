import {
  claimTableCallPushNotification,
  markTableCallPushSent,
  subscribeTableCalls,
  wasTableCallPushSent,
} from './firebaseService';
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

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function shouldSendPush(callId) {
  if (await wasTableCallPushSent(callId)) return false;

  const claimed = await claimTableCallPushNotification(callId);
  if (claimed) return true;

  await wait(1200);
  if (await wasTableCallPushSent(callId)) return false;

  // Claim başarısız (rules vb.) — yine de bir kez dene
  return true;
}

/**
 * makara-16344 / tablecalls dinler.
 * Banner anında; FCM bir kez gider (OS tag ile çift bildirim engellenir).
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

    notifyTableCallLocally({ tableNumber, callId: call.id, message });

    try {
      if (!(await shouldSendPush(call.id))) {
        console.info('[table-call] Push zaten gönderilmiş:', call.id);
        return;
      }

      console.info('[table-call] Push gönderiliyor', { callId: call.id, tableNumber });

      const result = await notifyTableCallPush({
        branchKey,
        tableNumber,
        callId: call.id,
        message,
      });

      if ((result?.sent ?? 0) > 0) {
        await markTableCallPushSent(call.id, { sentCount: result.sent });
      }

      console.info('[table-call] FCM push tamam', {
        callId: call.id,
        sent: result?.sent ?? 0,
      });
    } catch (err) {
      console.error('[table-call] Push relay hatası:', err);
      relayProcessed.delete(call.id);
    }
  });
}

export { formatTableCallLabel };
