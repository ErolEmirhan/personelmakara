import { parseSaleDateTime, toDayKey, getTodayDayKey } from './breakfastSales';

export { getTodayDayKey };

function normalizeSaleItem(raw) {
  return {
    product_name: (raw?.product_name || raw?.name || 'Ürün').trim(),
    quantity: Math.max(0, Number(raw?.quantity) || 0),
    price: Number(raw?.price) || 0,
    isGift: !!(raw?.isGift || raw?.is_gift),
    staff_id: raw?.staff_id ?? null,
    staff_name: raw?.staff_name ?? null,
    item_note: raw?.item_note || raw?.note || null,
  };
}

export function getSaleItems(sale) {
  if (Array.isArray(sale?.items_array) && sale.items_array.length) {
    return sale.items_array.map(normalizeSaleItem).filter((i) => i.quantity > 0);
  }
  if (Array.isArray(sale?.items) && sale.items.length) {
    return sale.items.map(normalizeSaleItem).filter((i) => i.quantity > 0);
  }
  if (typeof sale?.items === 'string' && sale.items.trim()) {
    try {
      const parsed = JSON.parse(sale.items);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeSaleItem).filter((i) => i.quantity > 0);
      }
    } catch {
      /* ignore */
    }
  }
  return [];
}

export function formatSaleClock(sale) {
  if (sale?.sale_time) {
    const parts = String(sale.sale_time).split(':');
    const hour = String(parts[0] ?? '00').padStart(2, '0');
    const minute = String(parts[1] ?? '00').padStart(2, '0');
    return `${hour}:${minute}`;
  }
  const dt = parseSaleDateTime(sale);
  if (!dt) return '--:--';
  return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
}

export function formatPaymentMethod(method) {
  if (!method) return 'Belirtilmedi';
  const value = String(method).trim().toLowerCase();
  if (value.includes('nakit') || value === 'cash') return 'Nakit';
  if (value.includes('kart') || value.includes('card') || value.includes('kredi')) return 'Kart';
  if (value.includes('iban') || value.includes('havale') || value.includes('eft')) return 'Havale / IBAN';
  if (value.includes('yemek') || value.includes('ticket')) return 'Yemek kartı';
  return String(method);
}

export function saleSortTimestamp(sale) {
  const dt = parseSaleDateTime(sale);
  return dt ? dt.getTime() : 0;
}

export function filterSalesForDay(sales, dayKey = getTodayDayKey()) {
  return (sales || [])
    .filter((sale) => {
      const dt = parseSaleDateTime(sale);
      return dt && toDayKey(dt) === dayKey;
    })
    .sort((a, b) => saleSortTimestamp(b) - saleSortTimestamp(a));
}

export function summarizeDaySales(sales) {
  const list = sales || [];
  const totalRevenue = list.reduce((sum, sale) => sum + (Number(sale.total_amount) || 0), 0);
  const itemCount = list.reduce((sum, sale) => sum + getSaleItems(sale).length, 0);
  return {
    saleCount: list.length,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    itemCount,
  };
}

export function buildSaleDisplayRows(sales, dayKey = getTodayDayKey()) {
  return filterSalesForDay(sales, dayKey).map((sale) => {
    const items = getSaleItems(sale);
    const computedTotal = items.reduce(
      (sum, item) => sum + (item.isGift ? 0 : item.price * item.quantity),
      0
    );
    return {
      id: sale.firestoreId || sale.sale_id || `${sale.table_name}-${sale.sale_time}`,
      sale,
      tableName: (sale.table_name || 'Masa').trim(),
      clock: formatSaleClock(sale),
      completedBy: (sale.staff_name || 'Personel').trim(),
      paymentLabel: formatPaymentMethod(sale.payment_method),
      totalAmount: Number(sale.total_amount) || computedTotal,
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      timestamp: saleSortTimestamp(sale),
    };
  });
}
