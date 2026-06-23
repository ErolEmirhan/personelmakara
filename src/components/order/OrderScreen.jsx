import { useLayoutEffect, useMemo, useState } from 'react';
import { useBranch } from '../../context/BranchContext';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { canCancelOrderItem } from '../../config/branch';
import { ProductCard } from './ProductCard';
import { ExistingOrdersPanel } from './ExistingOrdersPanel';
import { CancelItemModal } from '../modals/CancelItemModal';
import { TurkishCoffeeChoiceModal } from '../modals/TurkishCoffeeChoiceModal';
import { ProductGridSkeleton } from '../ui/Skeleton';
import {
  buildCoffeeDisplayName,
  needsCoffeeSugarModal,
} from '../../utils/productOptions';

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
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      return products.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (selectedCategory) {
      return products.filter((p) => p.category_id === selectedCategory);
    }
    return products;
  }, [products, selectedCategory, searchQuery]);

  const categoryRows = useMemo(() => {
    const rows = [[], [], []];
    categories.forEach((cat, i) => {
      rows[i % 3].push(cat);
    });
    return rows;
  }, [categories]);

  const canCancel = canCancelOrderItem(staff, branchKey);
  const accent = theme.accentSolid;

  return (
    <div className="px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))]">
      <button
        onClick={goBackToTables}
        className="w-full flex items-center justify-center gap-2 py-3 mb-4 rounded-2xl surface-card text-slate-700 font-bold active:scale-[0.98] transition-all duration-ui ease-premium"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Masalara Dön
      </button>

      <div className="overflow-x-auto mb-4 -mx-4 px-4 scrollbar-hide">
        <div className="flex flex-col gap-1.5 min-w-max">
          {categoryRows.map((row, ri) => (
            <div key={ri} className="flex gap-2">
              {row.map((cat) => {
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-ui ease-premium ${
                      active
                        ? `bg-gradient-to-r ${theme.accent} text-white shadow-float scale-[1.02]`
                        : 'surface-card text-slate-600 hover:border-slate-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="relative mb-4">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Ürün ara..."
          className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-100/90 bg-white/80 backdrop-blur-sm focus-accent text-base transition-all duration-ui ease-premium shadow-card"
          style={{ '--accent-solid': accent, '--accent-ring': `${accent}33` }}
        />
      </div>

      <ExistingOrdersPanel
        items={currentOrderItems}
        canCancel={canCancel}
        onCancelItem={canCancel ? (item) => setCancelItem(item) : undefined}
      />

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

      {loading ? (
        <ProductGridSkeleton count={6} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
            {filteredProducts.map((product, index) => (
              <div
                key={product.id}
                className="animate-stagger-in opacity-0"
                style={{ animationDelay: `${Math.min(index, 11) * 45}ms` }}
              >
                <ProductCard
                  product={product}
                  onAdd={handleProductAdd}
                />
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-14">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/80 border border-slate-100 shadow-card mb-3">
                <span className="text-2xl" aria-hidden>🔍</span>
              </div>
              <p className="text-slate-500 font-medium">Ürün bulunamadı</p>
              <p className="text-slate-400 text-sm mt-1">Farklı bir kategori veya arama deneyin</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
