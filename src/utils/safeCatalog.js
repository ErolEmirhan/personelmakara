/** Firebase / önbellekten gelen katalog verisini render-safe hale getirir */

export function sanitizeCategory(raw) {
  if (!raw || raw.id == null) return null;
  const id = typeof raw.id === 'string' ? parseInt(raw.id, 10) : raw.id;
  if (!Number.isFinite(id)) return null;
  return {
    ...raw,
    id,
    name: String(raw.name || '').trim() || 'Kategori',
    order_index: Number(raw.order_index) || 0,
  };
}

export function sanitizeProduct(raw) {
  if (!raw || raw.id == null) return null;
  const id = typeof raw.id === 'string' ? parseInt(raw.id, 10) : raw.id;
  if (!Number.isFinite(id)) return null;
  const categoryId =
    raw.category_id == null
      ? null
      : typeof raw.category_id === 'string'
        ? parseInt(raw.category_id, 10)
        : raw.category_id;

  return {
    ...raw,
    id,
    name: String(raw.name || '').trim() || 'Ürün',
    price: Number(raw.price) || 0,
    category_id: Number.isFinite(categoryId) ? categoryId : null,
    stock: Number(raw.stock) || 0,
    trackStock: !!(raw.trackStock || raw.track_stock),
    content: String(raw.content || raw.description || raw.ingredients || '').trim(),
    calories: raw.calories != null && raw.calories !== '' ? String(raw.calories).trim() : (
      raw.calorie != null && raw.calorie !== '' ? String(raw.calorie).trim() : (
        raw.calorie_info != null && raw.calorie_info !== '' ? String(raw.calorie_info).trim() : ''
      )
    ),
    detailsEditedManually: !!raw.detailsEditedManually,
    imageSrc: raw.imageSrc || null,
  };
}

export function sanitizeCatalog(categories = [], products = []) {
  const safeCategories = (Array.isArray(categories) ? categories : [])
    .map(sanitizeCategory)
    .filter(Boolean);

  const validCategoryIds = new Set(safeCategories.map((c) => c.id));
  const safeProducts = (Array.isArray(products) ? products : [])
    .map(sanitizeProduct)
    .filter((p) => p && (p.category_id == null || validCategoryIds.has(p.category_id)));

  return { categories: safeCategories, products: safeProducts };
}
