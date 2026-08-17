import { submitAndWaitMobileAction } from '../services/firebaseService';

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
    staffIsManager: !!(staff.is_manager || staff.is_chef),
    staffIsChef: !!staff.is_chef,
    staffIsAdmin: !!staff.is_admin,
    staffIsBoss: !!staff.is_boss,
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
