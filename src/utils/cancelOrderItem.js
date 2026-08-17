import { submitAndWaitMobileAction } from '../services/firebaseService';
import { buildStaffActionMeta } from './staffRole';

export async function cancelOrderItems({
  item,
  tableId,
  staff,
  cancelQty,
  reason,
}) {
  const base = {
    type: 'cancel_item',
    itemId: item.id,
    cancelReason: reason,
    tableId,
    staffId: staff.id,
    staffName: `${staff.name} ${staff.surname}`,
    ...buildStaffActionMeta(staff),
  };

  const maxQty = item.quantity || 1;

  if (cancelQty >= maxQty) {
    return submitAndWaitMobileAction({
      ...base,
      cancelQuantity: maxQty,
    });
  }

  let lastResult = null;
  for (let i = 0; i < cancelQty; i += 1) {
    lastResult = await submitAndWaitMobileAction({
      ...base,
      cancelQuantity: 1,
    });
    if (!lastResult.success) {
      return {
        ...lastResult,
        partialCount: i,
      };
    }
  }
  return lastResult;
}
