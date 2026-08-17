import {
  claimTableCallPushNotification,
  subscribeTableCalls,
  wasTableCallPushSent,
} from './firebaseService';
import {
  isPushConfiguredForBranch,
  notifyTableCallLocally,
  notifyTableCallPush,
} from './pushNotifications';

const relayProcessed = new Set();
const DEDUP_STORAGE_KEY = 'makara_table_call_push_dedup';
const DEDUP_TTL_MS = 60 * 60 * 1000;

function formatTableCallLabel(tableNumber) {
  const label = tableNumber != null && String(tableNumber).trim() !== ''
    ? String(tableNumber).trim()
    : '?';
  return `MASA ${label} Garson Çağırıyor`;
}

function loadPushDedup() {
  try {
    const raw = localStorage.getItem(DEDUP_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function wasPushDispatchedLocally(callId) {
  const ts = loadPushDedup()[callId];
  if (!ts) return false;
  return Date.now() - ts < DEDUP_TTL_MS;
}

function markPushDispatchedLocally(callId) {
  try {
    const map = loadPushDedup();
    map[callId] = Date.now();
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const [id, ts] of Object.entries(map)) {
      if (ts < cutoff) delete map[id];
    }
    localStorage.setItem(DEDUP_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/**
 * makara-16344 / tablecalls dinler.
 * Uygulama içi banner hemen; FCM yalnızca bir cihazdan, bir kez gider.
 */
export function startTableCallPushRelay(branchKey, staffId = null) {
  if (!branchKey) {
    return () => {};
  }

  if (!isPushConfiguredForBranch(branchKey)) {
    console.warn('[table-call] Push bu şube için yapılandırılmamış:', branchKey);
    return () => {};
  }

  return subscribeTableCalls(async (call) => {
    if (!call?.id || relayProcessed.has(call.id)) return;
    if (wasPushDispatchedLocally(call.id)) return;

    relayProcessed.add(call.id);

    const tableNumber = call.tableNumber;
    const message = formatTableCallLabel(tableNumber);

    notifyTableCallLocally({ tableNumber, callId: call.id, message });

    try {
      if (await wasTableCallPushSent(call.id)) {
        markPushDispatchedLocally(call.id);
        return;
      }

      const claimed = await claimTableCallPushNotification(call.id);
      if (!claimed) {
        return;
      }

      markPushDispatchedLocally(call.id);

      console.info('[table-call] Push gönderiliyor', {
        callId: call.id,
        tableNumber,
      });

      const result = await notifyTableCallPush({
        branchKey,
        tableNumber,
        callId: call.id,
        message,
        excludeStaffId: staffId,
      });

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
