const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const WEEKDAYS_TR = [
  'Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi',
];

export function normalizeCategoryName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim();
}

/** "Kahvaltı" / "Kahvaltılar" vb. */
export function isBreakfastCategoryName(name) {
  return normalizeCategoryName(name).includes('kahvalt');
}

export function resolveBreakfastCategoryIds(categories) {
  return (categories || [])
    .filter((c) => isBreakfastCategoryName(c.name))
    .map((c) => c.id);
}

export function buildBreakfastProductIdSet(products, breakfastCategoryIds) {
  const idSet = new Set();
  const catSet = new Set(breakfastCategoryIds.map((id) => Number(id)));
  (products || []).forEach((p) => {
    if (catSet.has(Number(p.category_id))) {
      idSet.add(Number(p.id));
      idSet.add(String(p.id));
    }
  });
  return idSet;
}

export function parseSaleDateTime(sale) {
  if (sale?.sale_date) {
    const parts = String(sale.sale_date).split('.');
    if (parts.length === 3) {
      const [day, month, year] = parts.map((x) => parseInt(x, 10));
      if (day && month && year) {
        let hour = 0;
        let minute = 0;
        let second = 0;
        if (sale.sale_time) {
          const t = String(sale.sale_time).split(':').map((x) => parseInt(x, 10));
          hour = t[0] || 0;
          minute = t[1] || 0;
          second = t[2] || 0;
        }
        return new Date(year, month - 1, day, hour, minute, second);
      }
    }
  }
  if (sale?.created_at?.toDate) {
    return sale.created_at.toDate();
  }
  if (sale?.created_at?.seconds) {
    return new Date(sale.created_at.seconds * 1000);
  }
  return null;
}

export function toDayKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDayLabel(dayKey) {
  if (!dayKey) return '';
  const [y, m, d] = dayKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${d} ${MONTHS_TR[m - 1]} ${y} · ${WEEKDAYS_TR[date.getDay()]}`;
}

export function formatShortDayLabel(dayKey) {
  if (!dayKey) return '';
  const [, m, d] = dayKey.split('-').map(Number);
  return `${d} ${MONTHS_TR[m - 1]}`;
}

function isBreakfastItem(item, breakfastProductIds) {
  const pid = item?.product_id;
  if (pid != null && breakfastProductIds.has(pid)) return true;
  if (pid != null && breakfastProductIds.has(Number(pid))) return true;
  if (pid != null && breakfastProductIds.has(String(pid))) return true;
  return false;
}

function itemKey(item) {
  const name = (item.product_name || item.name || 'Ürün').trim();
  const price = Number(item.price) || 0;
  return `${name}__${price}`;
}

/**
 * Firestore sales[] + katalog → gün gün kahvaltı özeti
 */
export function aggregateBreakfastSalesByDay(sales, products, categories) {
  const breakfastCategoryIds = resolveBreakfastCategoryIds(categories);
  const breakfastProductIds = buildBreakfastProductIdSet(products, breakfastCategoryIds);

  if (!breakfastCategoryIds.length) {
    return {
      days: [],
      breakfastCategoryIds: [],
      breakfastCategoryName: null,
      warning: 'Kahvaltı kategorisi bulunamadı',
    };
  }

  const breakfastCategoryName =
    categories.find((c) => isBreakfastCategoryName(c.name))?.name || 'Kahvaltı';

  const dayMap = new Map();

  (sales || []).forEach((sale) => {
    const saleDate = parseSaleDateTime(sale);
    const dayKey = toDayKey(saleDate);
    if (!dayKey) return;

    const items = Array.isArray(sale.items_array) ? sale.items_array : [];
    const breakfastItems = items.filter((item) => isBreakfastItem(item, breakfastProductIds));
    if (!breakfastItems.length) return;

    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, {
        dayKey,
        dateLabel: formatDayLabel(dayKey),
        shortLabel: formatShortDayLabel(dayKey),
        saleDateRaw: sale.sale_date || null,
        totalRevenue: 0,
        totalQuantity: 0,
        giftQuantity: 0,
        saleCount: 0,
        products: new Map(),
      });
    }

    const day = dayMap.get(dayKey);
    day.saleCount += 1;

    breakfastItems.forEach((item) => {
      const qty = Math.max(0, Number(item.quantity) || 0);
      if (qty <= 0) return;

      const isGift = !!item.isGift;
      const price = Number(item.price) || 0;
      const revenue = isGift ? 0 : price * qty;
      const name = (item.product_name || item.name || 'Ürün').trim();
      const key = itemKey(item);

      day.totalQuantity += qty;
      if (isGift) day.giftQuantity += qty;
      day.totalRevenue += revenue;

      if (!day.products.has(key)) {
        day.products.set(key, {
          productId: item.product_id ?? null,
          name,
          unitPrice: price,
          quantity: 0,
          giftQuantity: 0,
          revenue: 0,
        });
      }
      const row = day.products.get(key);
      row.quantity += qty;
      if (isGift) row.giftQuantity += qty;
      row.revenue += revenue;
    });
  });

  const days = Array.from(dayMap.values())
    .map((day) => ({
      ...day,
      totalRevenue: Math.round(day.totalRevenue * 100) / 100,
      products: Array.from(day.products.values())
        .sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity),
    }))
    .sort((a, b) => b.dayKey.localeCompare(a.dayKey));

  return {
    days,
    breakfastCategoryIds,
    breakfastCategoryName,
    warning: null,
  };
}

export function getTodayDayKey() {
  return toDayKey(new Date());
}
