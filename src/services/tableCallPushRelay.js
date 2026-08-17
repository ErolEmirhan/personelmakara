import { subscribeTableCalls } from './firebaseService';
import { sendTableCallPush } from './pushNotifications';

const dispatched = new Set();

/** tablecalls → sendTableCallPush (ekip mesajı ile aynı API yolu) */
export function startTableCallPushRelay(branchKey) {
  if (!branchKey) return () => {};

  return subscribeTableCalls(async (call) => {
    if (!call?.id || dispatched.has(call.id)) return;
    dispatched.add(call.id);

    try {
      await sendTableCallPush({
        branchKey,
        tableNumber: call.tableNumber,
        callId: call.id,
      });
    } catch (err) {
      console.error('[table-call] push hatası:', err);
      dispatched.delete(call.id);
    }
  });
}
