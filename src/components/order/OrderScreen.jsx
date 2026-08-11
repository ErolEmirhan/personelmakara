import { useLayoutEffect, useMemo, useState, useEffect } from 'react';
import { useBranch } from '../../context/BranchContext';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { canCancelOrderItem } from '../../config/branch';
import { OrderCartButton } from '../layout/Cart';
import { ProductCard } from './ProductCard';
import { CategorySidebar } from './CategorySidebar';
import { ExistingOrdersPanel } from './ExistingOrdersPanel';
import { CancelItemModal } from '../modals/CancelItemModal';
import { TurkishCoffeeChoiceModal } from '../modals/TurkishCoffeeChoiceModal';
import { ProductGridSkeleton } from '../ui/Skeleton';
import {
  buildCoffeeDisplayName,
  needsCoffeeSugarModal,
} from '../../utils/productOptions';
import { sortProductsByPreference } from '../../utils/productOrder';
import {
  getBestSellersEnabled,
  invalidateBestSellersCache,
  isBestSellersCategory,
  loadBestSellingProducts,
} from '../../utils/bestSellers';

const ORDER_PANEL_HEIGHT =
  'calc(100dvh - 3.5rem - 10px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))';

export function OrderScreen() {
  const { branchKey, theme } = useBranch();
  const { staff } = useAuth();
  const {
    categories, products, selectedCategory, setSelectedCategory,
    searchQuery, setSearchQuery, addToCart, goBackToTables,
    currentOrderItems, loading, selectedTable, showToast,
  } = useApp();
  const [cancelItem, setCancelItem] = useState(null);
  const [coffeeProduct, setCoffeeProduct] = useState(null);
  const [menuOrderVersion, setMenuOrderVersion] = useState(0);
  const [bestSellersEnabled, setBestSellersEnabled] = useState(() =>
    getBestSellersEnabled(staff?.id, branchKey)
  );
  const [bestSellerProducts, setBestSellerProducts] = useState([]);
  const [bestSellersLoading, setBestSellersLoading] = useState(false);

  useEffect(() => {
    setBestSellersEnabled(getBestSellersEnabled(staff?.id, branchKey));
  }, [staff?.id, branchKey, menuOrderVersion]);

  useEffect(() => {
    if (!bestSellersEnabled || !products.length) {
      setBestSellerProducts([]);
      setBestSellersLoading(false);
      return undefined;
    }

    let cancelled = false;
    setBestSellersLoading(true);

    loadBestSellingProducts(products)
      .then((list) => {
        if (!cancelled) setBestSellerProducts(list);
      })
      .catch(() => {
        if (!cancelled) setBestSellerProducts([]);
      })
      .finally(() => {
        if (!cancelled) setBestSellersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bestSellersEnabled, products, menuOrderVersion]);

  const handleBestSellersChange = (enabled) => {
    invalidateBestSellersCache();
    setBestSellersEnabled(enabled);
    setMenuOrderVersion((v) => v + 1);
    if (!enabled && isBestSellersCategory(selectedCategory)) {
      const firstReal = categories.find((c) => !isBestSellersCategory(c.id));
      if (firstReal) setSelectedCategory(firstReal.id);
    }
  };

  const handleProductAdd = (product) => {
    if (product.trackStock && product.stock <= 0) {
      showToast('error', 'Tükendi', `${product.name} stokta yok`);
      return;
    }
    if (needsCoffeeSugarModal(product.name)) {
      setCoffeeProduct(product);
      return;
    }
    addToCart(product);
  };

  const handleCoffeeSelect = (option) => {
    if (!coffeeProduct) return;
    if (coffeeProduct.trackStock && coffeeProduct.stock <= 0) {
      showToast('error', 'Tükendi', `${coffeeProduct.name} stokta yok`);
      setCoffeeProduct(null);
      return;
    }
    const displayName = buildCoffeeDisplayName(coffeeProduct.name, option);
    addToCart(coffeeProduct, { displayName });
    setCoffeeProduct(null);
  };

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [selectedTable?.id]);

  const filteredProducts = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      return list.filter((p) => String(p?.name || '').toLowerCase().includes(q));
    }
    if (selectedCategory && isBestSellersCategory(selectedCategory)) {
      return bestSellerProducts;
    }
    if (selectedCategory) {
      const inCategory = list.filter((p) => p?.category_id === selectedCategory);
      return sortProductsByPreference(inCategory, staff?.id, branchKey, selectedCategory);
    }
    return list;
  }, [
    products,
    selectedCategory,
    searchQuery,
    staff?.id,
    branchKey,
    menuOrderVersion,
    bestSellerProducts,
  ]);

  const productsLoading = loading || (bestSellersEnabled && isBestSellersCategory(selectedCategory) && bestSellersLoading);

  const canCancel = canCancelOrderItem(staff, branchKey);
  const accent = theme.accentSolid;
  const tableLabel = selectedTable?.name || `Masa ${selectedTable?.number ?? ''}`;

  return (
    <div
      className="flex overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100/80"
      style={{ height: ORDER_PANEL_HEIGHT }}
    >
      <CategorySidebar
        categories={categories}
        products={products}
        selectedCategory={selectedCategory}
        onSelect={setSelectedCategory}
        staffId={staff?.id}
        branchKey={branchKey}
        theme={theme}
        bestSellersEnabled={bestSellersEnabled}
        onMenuOrderChange={() => setMenuOrderVersion((v) => v + 1)}
        onBestSellersChange={handleBestSellersChange}
      />

      <div className="flex flex-1 flex-col min-w-0 min-h-0">
        <header className="shrink-0 px-3 pt-2 pb-2 border-b border-slate-200/70 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2.5">
            <button
              type="button"
              onClick={goBackToTables}
              className="shrink-0 w-10 h-10 rounded-xl surface-card flex items-center justify-center text-slate-700 active:scale-95 transition-transform"
              aria-label="Masalara dön"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Sipariş</p>
              <h2 className="text-base font-display font-bold text-slate-900 truncate">{tableLabel}</h2>
            </div>
            <OrderCartButton />
          </div>

          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ürün ara..."
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-100 bg-white focus-accent text-[15px] transition-all shadow-sm"
              style={{ '--accent-solid': accent, '--accent-ring': `${accent}33` }}
            />
          </div>
        </header>

        <div className="shrink-0 px-3 pt-2">
          <ExistingOrdersPanel
            items={currentOrderItems}
            canCancel={canCancel}
            onCancelItem={canCancel ? (item) => setCancelItem(item) : undefined}
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-2.5 pt-2 pb-4 scrollbar-hide">
          {productsLoading ? (
            <ProductGridSkeleton count={4} columns={2} />
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white border border-slate-100 shadow-sm mb-3">
                <span className="text-xl" aria-hidden>
                  {isBestSellersCategory(selectedCategory) ? '📊' : '🔍'}
                </span>
              </div>
              <p className="text-slate-500 font-medium text-sm">
                {isBestSellersCategory(selectedCategory)
                  ? 'Henüz satış verisi yok'
                  : 'Ürün bulunamadı'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map((product, index) => (
                <div
                  key={`${product.id}-${index}`}
                  className="animate-stagger-in opacity-0 min-w-0"
                  style={{ animationDelay: `${Math.min(index, 11) * 35}ms` }}
                >
                  <ProductCard product={product} onAdd={handleProductAdd} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CancelItemModal
        open={!!cancelItem}
        item={cancelItem}
        tableId={selectedTable?.id}
        onClose={() => setCancelItem(null)}
      />

      <TurkishCoffeeChoiceModal
        open={!!coffeeProduct}
        product={coffeeProduct}
        onSelect={handleCoffeeSelect}
        onClose={() => setCoffeeProduct(null)}
      />
    </div>
  );
}
