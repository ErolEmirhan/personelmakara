import { useCallback, useEffect, useMemo, useState } from 'react';
import { BottomSheet } from '../ui/BottomSheet';
import { ReorderList } from './ReorderList';
import {
  resetCategoryOrder,
  saveCategoryOrder,
  sortCategoriesByPreference,
} from '../../utils/categoryOrder';
import {
  resetProductOrder,
  saveProductOrder,
  sortProductsByPreference,
} from '../../utils/productOrder';
import {
  getBestSellersEnabled,
  isBestSellersCategory,
  setBestSellersEnabled,
} from '../../utils/bestSellers';
import { hapticLight } from '../../utils/haptic';

const MODES = {
  CATEGORIES: 'categories',
  PRODUCTS: 'products',
};

function ToggleSwitch({ checked, onChange, accent, label, description }) {
  return (
    <label className="mx-4 mb-3 flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-900">{label}</p>
        {description && (
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-12 h-7 rounded-full transition-colors ${
          checked ? '' : 'bg-slate-200'
        }`}
        style={checked ? { backgroundColor: accent } : undefined}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  );
}

function ModeSwitch({ mode, onChange, accent }) {
  return (
    <div className="mx-4 mb-3 p-1 rounded-2xl bg-slate-100 flex gap-1">
      {[
        { id: MODES.CATEGORIES, label: 'Kategoriler' },
        { id: MODES.PRODUCTS, label: 'Ürünler' },
      ].map((tab) => {
        const active = mode === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              onChange(tab.id);
              hapticLight();
            }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] ${
              active ? 'text-white shadow-md' : 'text-slate-500'
            }`}
            style={
              active
                ? { background: `linear-gradient(145deg, ${accent} 0%, ${accent}cc 100%)` }
                : undefined
            }
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function MenuOrderSheet({
  open,
  onClose,
  categories,
  products,
  staffId,
  branchKey,
  theme,
  selectedCategory,
  onCategoriesSaved,
  onProductsSaved,
  bestSellersEnabled,
  onBestSellersChange,
}) {
  const [mode, setMode] = useState(MODES.CATEGORIES);
  const [categoryItems, setCategoryItems] = useState([]);
  const [productItems, setProductItems] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState(selectedCategory);
  const [bestSellersOn, setBestSellersOn] = useState(bestSellersEnabled);

  const accent = theme?.accentSolid || '#7c3aed';

  const realCategories = useMemo(
    () => (categories || []).filter((c) => !isBestSellersCategory(c.id)),
    [categories]
  );

  const orderedCategories = useMemo(
    () => sortCategoriesByPreference(realCategories, staffId, branchKey),
    [realCategories, staffId, branchKey]
  );

  const editableCategories = useMemo(
    () => orderedCategories.filter((c) => !isBestSellersCategory(c.id)),
    [orderedCategories]
  );

  const categoryProducts = useMemo(() => {
    if (activeCategoryId == null || isBestSellersCategory(activeCategoryId)) return [];
    return (products || []).filter((p) => p.category_id === activeCategoryId);
  }, [products, activeCategoryId]);

  useEffect(() => {
    if (!open) return;
    setMode(MODES.CATEGORIES);
    setBestSellersOn(getBestSellersEnabled(staffId, branchKey));
    setCategoryItems(sortCategoriesByPreference(realCategories, staffId, branchKey));
    const firstCat = editableCategories.find((c) => !isBestSellersCategory(c.id));
    setActiveCategoryId(
      selectedCategory && !isBestSellersCategory(selectedCategory)
        ? selectedCategory
        : firstCat?.id ?? null
    );
  }, [open, realCategories, staffId, branchKey, selectedCategory, editableCategories]);

  useEffect(() => {
    if (!open || activeCategoryId == null || isBestSellersCategory(activeCategoryId)) return;
    setProductItems(
      sortProductsByPreference(categoryProducts, staffId, branchKey, activeCategoryId)
    );
  }, [open, activeCategoryId, categoryProducts, staffId, branchKey]);

  const handleCategoryChange = useCallback((next) => {
    const realOnly = next.filter((c) => !isBestSellersCategory(c.id));
    setCategoryItems(realOnly);
    saveCategoryOrder(staffId, branchKey, realOnly.map((c) => c.id));
    onCategoriesSaved?.(realOnly);
  }, [staffId, branchKey, onCategoriesSaved]);

  const handleProductChange = useCallback((next) => {
    setProductItems(next);
    if (activeCategoryId == null || isBestSellersCategory(activeCategoryId)) return;
    saveProductOrder(staffId, branchKey, activeCategoryId, next.map((p) => p.id));
    onProductsSaved?.();
  }, [staffId, branchKey, activeCategoryId, onProductsSaved]);

  const handleBestSellersToggle = (enabled) => {
    setBestSellersOn(enabled);
    setBestSellersEnabled(staffId, branchKey, enabled);
    onBestSellersChange?.(enabled);
    hapticLight();
  };

  const handleResetCategories = () => {
    resetCategoryOrder(staffId, branchKey);
    const defaults = sortCategoriesByPreference(realCategories, null, null);
    setCategoryItems(defaults);
    onCategoriesSaved?.(defaults);
    hapticLight();
  };

  const handleResetProducts = () => {
    if (activeCategoryId == null || isBestSellersCategory(activeCategoryId)) return;
    resetProductOrder(staffId, branchKey, activeCategoryId);
    const defaults = sortProductsByPreference(categoryProducts, null, null, null);
    setProductItems(defaults);
    onProductsSaved?.();
    hapticLight();
  };

  const activeCategoryName =
    editableCategories.find((c) => c.id === activeCategoryId)?.name || 'Kategori';

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Menü düzenle"
      subtitle="Aşağı kaydırarak kapatabilirsiniz · sadece sizin ekranınızda geçerli"
      zIndexClass="z-[120]"
      footer={(
        <div className="px-4 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-[15px] active:scale-[0.98] transition-transform"
            style={{
              background: `linear-gradient(145deg, ${accent} 0%, ${accent}cc 100%)`,
            }}
          >
            Tamam
          </button>
        </div>
      )}
    >
      <ToggleSwitch
        checked={bestSellersOn}
        onChange={handleBestSellersToggle}
        accent={accent}
        label="En çok satanlar"
        description="Aktifken kategorilerin en üstünde satış verisine göre 15 ürün gösterilir"
      />

      <ModeSwitch mode={mode} onChange={setMode} accent={accent} />

      {mode === MODES.CATEGORIES ? (
        <>
          <div className="px-4 pb-2 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500 leading-relaxed">
              Kategori sırasını değiştirin.
            </p>
            <button
              type="button"
              onClick={handleResetCategories}
              className="shrink-0 text-xs font-bold text-slate-500 px-3 py-2 rounded-xl bg-slate-100 active:scale-[0.98] transition-transform"
            >
              Varsayılan
            </button>
          </div>
          <ReorderList
            items={categoryItems}
            onChange={handleCategoryChange}
            getLabel={(cat) => cat.name}
          />
        </>
      ) : (
        <>
          <div className="px-4 pb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Kategori seçin
            </p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {editableCategories.map((cat) => {
                const active = cat.id === activeCategoryId;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setActiveCategoryId(cat.id);
                      hapticLight();
                    }}
                    className={`shrink-0 px-3.5 py-2 rounded-xl text-sm font-bold transition-all active:scale-[0.98] ${
                      active
                        ? 'text-white shadow-md'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                    style={
                      active
                        ? { background: `linear-gradient(145deg, ${accent} 0%, ${accent}cc 100%)` }
                        : undefined
                    }
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-4 pb-2 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500 leading-relaxed min-w-0 truncate">
              <span className="font-semibold text-slate-700">{activeCategoryName}</span> içindeki ürünler
            </p>
            <button
              type="button"
              onClick={handleResetProducts}
              className="shrink-0 text-xs font-bold text-slate-500 px-3 py-2 rounded-xl bg-slate-100 active:scale-[0.98] transition-transform"
            >
              Varsayılan
            </button>
          </div>

          <ReorderList
            items={productItems}
            onChange={handleProductChange}
            getLabel={(product) => product.name}
            getMeta={(product) => `${Number(product.price || 0).toFixed(2)} ₺`}
          />
        </>
      )}
    </BottomSheet>
  );
}
