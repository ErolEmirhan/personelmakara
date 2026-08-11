import { fetchFirestoreSales } from '../services/firebaseService';

export const BEST_SELLERS_CATEGORY_ID = '__bestsellers__';
export const BEST_SELLERS_LIMIT = 15;

export const BEST_SELLERS_CATEGORY = {
  id: BEST_SELLERS_CATEGORY_ID,
  name: 'En Çok Satanlar',
  isVirtual: true,
};

const PREF_KEY = 'makara_bestsellers_pref';
const CACHE_MS = 5 * 60 * 1000;

let productCache = { signature: '', products: [], at: 0 };

function prefKey(staffId, branchKey) {
  return `${branchKey}:${staffId}`;
}

function readPrefs() {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function isBestSellersCategory(categoryId) {
  return String(categoryId) === BEST_SELLERS_CATEGORY_ID;
}

export function getBestSellersEnabled(staffId, branchKey) {
  if (!staffId || !branchKey) return false;
  return !!readPrefs()[prefKey(staffId, branchKey)];
}

export function setBestSellersEnabled(staffId, branchKey, enabled) {
  if (!staffId || !branchKey) return;
  try {
    const all = readPrefs();
    if (enabled) {
      all[prefKey(staffId, branchKey)] = true;
    } else {
      delete all[prefKey(staffId, branchKey)];
    }
    localStorage.setItem(PREF_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

function resolveProductId(item) {
  if (item?.product_id != null && item.product_id !== '') {
    const n = Number(item.product_id);
    return Number.isFinite(n) ? n : item.product_id;
  }
  return null;
}

function buildProductLookup(products) {
  const byId = new Map();
  (products || []).forEach((product) => {
    byId.set(product.id, product);
    byId.set(String(product.id), product);
    if (Number.isFinite(Number(product.id))) {
      byId.set(Number(product.id), product);
    }
  });
  return byId;
}

/** Firestore satış kayıtlarından en çok satan ürünleri hesaplar */
export function aggregateBestSellingProducts(sales, products, limit = BEST_SELLERS_LIMIT) {
  const counts = new Map();
  const lookup = buildProductLookup(products);

  (sales || []).forEach((sale) => {
    const items = Array.isArray(sale?.items_array) ? sale.items_array : [];
    items.forEach((item) => {
      const qty = Math.max(0, Number(item?.quantity) || 0);
      if (qty <= 0) return;

      let productId = resolveProductId(item);
      if (productId == null) {
        const name = String(item?.product_name || item?.name || '').trim().toLowerCase();
        if (!name) return;
        const matched = (products || []).find(
          (p) => String(p.name || '').trim().toLowerCase() === name
        );
        if (!matched) return;
        productId = matched.id;
      }

      const key = String(productId);
      if (!counts.has(key)) {
        counts.set(key, { productId, quantity: 0, revenue: 0 });
      }
      const row = counts.get(key);
      row.quantity += qty;
      if (!item?.isGift) {
        row.revenue += (Number(item?.price) || 0) * qty;
      }
    });
  });

  return Array.from(counts.values())
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    .slice(0, limit)
    .map((row) => lookup.get(row.productId) || lookup.get(Number(row.productId)))
    .filter(Boolean);
}

export function buildSidebarCategories(categories, staffId, branchKey, bestSellersEnabled, sortFn) {
  const sorted = sortFn(categories, staffId, branchKey);
  if (!bestSellersEnabled) return sorted;
  return [BEST_SELLERS_CATEGORY, ...sorted];
}

export async function loadBestSellingProducts(products, limit = BEST_SELLERS_LIMIT) {
  const signature = `${(products || []).length}:${limit}`;
  if (
    productCache.signature === signature &&
    Date.now() - productCache.at < CACHE_MS
  ) {
    return productCache.products;
  }

  const sales = await fetchFirestoreSales({ limitCount: 3000 });
  const result = aggregateBestSellingProducts(sales, products, limit);
  productCache = { signature, products: result, at: Date.now() };
  return result;
}

export function invalidateBestSellersCache() {
  productCache = { signature: '', products: [], at: 0 };
}
