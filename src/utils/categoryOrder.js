const STORAGE_KEY = 'makara_category_order';

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function orderKey(staffId, branchKey) {
  return `${branchKey}:${staffId}`;
}

function defaultSort(categories) {
  return [...categories].sort(
    (a, b) => (a.order_index - b.order_index) || (a.id - b.id)
  );
}

export function sortCategoriesByPreference(categories, staffId, branchKey) {
  if (!categories?.length) return [];
  if (!staffId || !branchKey) return defaultSort(categories);

  const saved = readAll()[orderKey(staffId, branchKey)];
  if (!Array.isArray(saved) || !saved.length) return defaultSort(categories);

  const byId = new Map(categories.map((c) => [c.id, c]));
  const ordered = [];

  saved.forEach((id) => {
    const cat = byId.get(id);
    if (cat) {
      ordered.push(cat);
      byId.delete(id);
    }
  });

  byId.forEach((cat) => ordered.push(cat));
  return ordered;
}

export function saveCategoryOrder(staffId, branchKey, categoryIds) {
  if (!staffId || !branchKey || !Array.isArray(categoryIds)) return;
  try {
    const all = readAll();
    all[orderKey(staffId, branchKey)] = categoryIds;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function resetCategoryOrder(staffId, branchKey) {
  if (!staffId || !branchKey) return;
  try {
    const all = readAll();
    delete all[orderKey(staffId, branchKey)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function hasCustomCategoryOrder(staffId, branchKey) {
  if (!staffId || !branchKey) return false;
  const saved = readAll()[orderKey(staffId, branchKey)];
  return Array.isArray(saved) && saved.length > 0;
}
