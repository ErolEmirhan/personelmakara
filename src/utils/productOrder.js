const STORAGE_KEY = 'makara_product_order';

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function staffKey(staffId, branchKey) {
  return `${branchKey}:${staffId}`;
}

function defaultProductSort(products) {
  return [...products].sort(
    (a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''), 'tr') ||
      (a.id - b.id)
  );
}

export function sortProductsByPreference(products, staffId, branchKey, categoryId) {
  if (!products?.length) return [];
  if (!staffId || !branchKey || categoryId == null) return defaultProductSort(products);

  const saved = readAll()[staffKey(staffId, branchKey)]?.[String(categoryId)];
  if (!Array.isArray(saved) || !saved.length) return defaultProductSort(products);

  const byId = new Map(products.map((p) => [p.id, p]));
  const ordered = [];

  saved.forEach((id) => {
    const product = byId.get(id);
    if (product) {
      ordered.push(product);
      byId.delete(id);
    }
  });

  byId.forEach((product) => ordered.push(product));
  return ordered;
}

export function saveProductOrder(staffId, branchKey, categoryId, productIds) {
  if (!staffId || !branchKey || categoryId == null || !Array.isArray(productIds)) return;
  try {
    const all = readAll();
    const key = staffKey(staffId, branchKey);
    if (!all[key]) all[key] = {};
    all[key][String(categoryId)] = productIds;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function resetProductOrder(staffId, branchKey, categoryId) {
  if (!staffId || !branchKey || categoryId == null) return;
  try {
    const all = readAll();
    const key = staffKey(staffId, branchKey);
    if (!all[key]) return;
    delete all[key][String(categoryId)];
    if (!Object.keys(all[key]).length) delete all[key];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function resetAllProductOrders(staffId, branchKey) {
  if (!staffId || !branchKey) return;
  try {
    const all = readAll();
    delete all[staffKey(staffId, branchKey)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}
