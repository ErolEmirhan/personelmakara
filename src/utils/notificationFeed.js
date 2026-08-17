import { getOrderCallSortTime } from './orderCalls';
import { getTableCallSortTime } from './tableCalls';

export function buildNotificationFeed({
  announcements = [],
  tableCalls = [],
  orderCalls = [],
}) {
  const items = [];

  announcements.forEach((item) => {
    items.push({
      kind: 'announcement',
      id: `announcement-${item.id}`,
      sortTime: item.createdAtMs || 0,
      announcement: item,
    });
  });

  tableCalls.forEach((call) => {
    items.push({
      kind: 'table_call',
      id: `table-call-${call.id}`,
      sortTime: getTableCallSortTime(call),
      tableCall: call,
      title: 'Garson çağrısı',
      body: `${call.tableName} garson istiyor`,
      tableNumber: call.tableNumber,
      callId: call.id,
    });
  });

  orderCalls.forEach((orderCall) => {
    items.push({
      kind: 'order_call',
      id: `order-call-${orderCall.id}`,
      sortTime: getOrderCallSortTime(orderCall),
      orderCall,
      title: 'Masa siparişi',
      body: `${orderCall.tableName || `Masa ${orderCall.tableNumber ?? '?'}`} · QR menü`,
      tableNumber: orderCall.tableNumber,
      orderCallId: orderCall.id,
    });
  });

  return items.sort((a, b) => b.sortTime - a.sortTime);
}
