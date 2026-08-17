import { subscribeTableCalls } from './firebaseService';
import { isPushConfiguredForBranch } from './pushNotifications';

const relayProcessed = new Set();

function apiUrl(path) {
  const root = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  return `${root}${path.replace(/^\//, '')}`;
}

function formatTableCallLabel(tableNumber) {
  const label = tableNumber != null && String(tableNumber).trim() !== ''
    ? String(tableNumber).trim()
    : '?';
  return `MASA ${label} Garson Çağırıyor`;
}

async function dispatchTableCallPush(branchKey, call) {
  const tableNumber = call.tableNumber;
  const message = formatTableCallLabel(tableNumber);

  const res = await fetch(apiUrl('api/push-table-call'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      branchKey,
      tableNumber,
      callId: call.id,
      message,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Garson çağrısı push API hatası');
  }

  console.info('[table-call] Push API yanıtı', {
    callId: call.id,
    source: call.source,
    tableNumber,
    sent: data?.sent ?? 0,
    skipped: data?.skipped ?? false,
  });

  return data;
}

/**
 * QR menüden gelen garson çağrılarını dinler; yeni çağrıda sunucu üzerinden push gönderir.
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

    try {
      console.info('[table-call] Yeni çağrı algılandı', {
        callId: call.id,
        source: call.source,
        tableNumber: call.tableNumber,
        status: call.status,
      });

      await dispatchTableCallPush(branchKey, call);
    } catch (err) {
      console.error('[table-call] Push relay hatası:', err);
      relayProcessed.delete(call.id);
    }
  });
}

export { formatTableCallLabel, dispatchTableCallPush };
