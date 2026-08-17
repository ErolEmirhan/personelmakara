import {
  claimOrderCallPushNotification,
  subscribeNewOrderCalls,
} from './firebaseService';
import {
  isPushConfiguredForBranch,
  notifyOrderCallPush,
} from './pushNotifications';

const relayProcessed = new Set();

/**
 * QR menü OrderCalls yazdığında push gönderir (tek seferlik claim).
 * QR tarafında push yoksa bu relay devreye girer.
 */
export function startOrderCallPushRelay(branchKey) {
  if (!branchKey || !isPushConfiguredForBranch(branchKey)) {
    return () => {};
  }

  return subscribeNewOrderCalls(branchKey, async (orderCall) => {
    if (!orderCall?.id || relayProcessed.has(orderCall.id)) return;
    relayProcessed.add(orderCall.id);

    const claimed = await claimOrderCallPushNotification(orderCall.id);
    if (!claimed) return;

    try {
      await notifyOrderCallPush({
        branchKey,
        orderCallId: orderCall.id,
        tableNumber: orderCall.tableNumber,
        total: orderCall.total,
        itemCount: orderCall.itemCount,
      });
    } catch (err) {
      console.error('[order-call] push relay hatası:', err);
    }
  });
}
