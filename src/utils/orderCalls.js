const PENDING_STATUSES = new Set(['pending', 'new', 'waiting', 'open']);

export function isPendingOrderCallStatus(status) {
  const normalized = String(status || 'pending').trim().toLowerCase();
  return PENDING_STATUSES.has(normalized);
}

/** QR menü OrderCalls kaydı mı? */
export function isOrderCallRecord(orderCall) {
  if (!orderCall) return false;
  const type = String(orderCall.type || 'table_order').trim().toLowerCase();
  if (type && type !== 'table_order') return false;
  return isPendingOrderCallStatus(orderCall.status);
}

export function normalizeOrderCallItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  return rawItems.map((item, index) => ({
    id: item.id ?? item.productId ?? item.product_id ?? `item-${index}`,
    name: item.name ?? item.productName ?? item.product_name ?? 'Ürün',
    price: Number(item.price ?? item.unitPrice ?? item.unit_price ?? 0),
    quantity: Math.max(1, Number(item.quantity ?? item.qty ?? 1)),
    category_id: item.categoryId ?? item.category_id ?? null,
    categoryName: item.categoryName ?? item.category_name ?? null,
    isGift: !!(item.isGift ?? item.is_gift),
    isYanUrun: !!(item.isYanUrun ?? item.is_yan_urun),
    extraNote: item.extraNote ?? item.note ?? item.item_note ?? null,
  }));
}

/**
 * QR menü OrderCalls şeması:
 * tableNumber, token, status, items[], itemCount, total, note,
 * date, time, timestamp, branchKey, type, source
 */
export function normalizeOrderCall(docSnap) {
  const data = docSnap.data() || {};
  const tableNumber = data.tableNumber ?? data.table_number ?? null;

  return {
    id: docSnap.id,
    branchKey: data.branchKey ?? data.branch_key ?? '',
    tableNumber,
    tableId: data.tableId ?? data.table_id ?? null,
    tableName: data.tableName ?? data.table_name ?? (tableNumber != null ? `Masa ${tableNumber}` : 'Masa'),
    orderNote: data.note ?? data.orderNote ?? data.order_note ?? '',
    status: data.status ?? 'pending',
    type: data.type ?? 'table_order',
    source: data.source ?? 'qr-menu',
    token: data.token ?? null,
    itemCount: Number(data.itemCount ?? data.item_count ?? 0) || null,
    total: Number(data.total ?? 0) || 0,
    timestamp: Number(data.timestamp ?? 0) || 0,
    items: normalizeOrderCallItems(data.items ?? []),
    createdAt: data.createdAt ?? data.created_at ?? null,
    date: data.date ?? null,
    time: data.time ?? null,
  };
}

export function getOrderCallSortTime(orderCall) {
  if (orderCall?.timestamp > 0) return orderCall.timestamp;
  if (orderCall?.createdAt?.toDate) return orderCall.createdAt.toDate().getTime();
  if (orderCall?.createdAt?.seconds) return orderCall.createdAt.seconds * 1000;
  return 0;
}

export function resolveTableForOrderCall(orderCall, tables) {
  if (!orderCall || !Array.isArray(tables)) return null;

  if (orderCall.tableId) {
    const byId = tables.find((table) => String(table.id) === String(orderCall.tableId));
    if (byId) return byId;
  }

  const tableNumber = Number(orderCall.tableNumber);
  if (Number.isFinite(tableNumber)) {
    return tables.find((table) => Number(table.number) === tableNumber) || null;
  }

  return null;
}

export function formatOrderCallTimestamp(orderCall) {
  if (orderCall?.date && orderCall?.time) {
    return `${orderCall.date} · ${orderCall.time}`;
  }

  if (orderCall?.timestamp > 0) {
    return new Date(orderCall.timestamp).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const createdAt = orderCall?.createdAt;
  if (createdAt?.toDate) {
    return createdAt.toDate().toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (createdAt?.seconds) {
    return new Date(createdAt.seconds * 1000).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return '—';
}

export function orderCallTotal(orderCall) {
  if (Number(orderCall?.total) > 0) return Number(orderCall.total);
  return (orderCall?.items || []).reduce(
    (sum, item) => sum + (item.isGift ? 0 : (Number(item.price) || 0) * (Number(item.quantity) || 0)),
    0
  );
}

export function orderCallItemCount(orderCall) {
  if (Number(orderCall?.itemCount) > 0) return Number(orderCall.itemCount);
  return (orderCall?.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
}
