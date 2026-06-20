import { useLayoutEffect, useMemo, useState } from 'react';
import { useBranch } from '../../context/BranchContext';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { canCancelOrderItem } from '../../config/branch';
import { ProductCard } from './ProductCard';
import { CategoryTabs } from './CategoryTabs';
import { ExistingOrdersPanel } from './ExistingOrdersPanel';
import { CancelItemModal } from '../modals/CancelItemModal';

export function OrderScreen() {
  const { branchKey } = useBranch();
  const { staff } = useAuth();
  const {
    categories, products, selectedCategory, setSelectedCategory,
    searchQuery, setSearchQuery, addToCart, goBackToTables,
    currentOrderItems, loading, selectedTable,
  } = useApp();
  const [cancelItem, setCancelItem] = useState(null);

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

  const canCancel = canCancelOrderItem(staff, branchKey);

  return (
    <div className="px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))]">
      <button
        onClick={goBackToTables}
        className="w-full flex items-center justify-center gap-2 py-3 mb-4 rounded-2xl bg-gray-100 text-gray-700 font-bold active:scale-[0.98] transition-transform"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Masalara Dön
      </button>

      <CategoryTabs
        categories={categories}
        products={products}
        selectedCategory={selectedCategory}
        onSelect={setSelectedCategory}
      />

      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Ürün ara..."
          className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-gray-100 bg-gray-50 focus:outline-none focus:border-purple-300 text-base"
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

      {/* Products grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-10 h-10 border-[3px] border-pink-100 border-t-pink-500 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm font-medium">Yükleniyor...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={addToCart}
              />
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <p className="text-center text-gray-400 py-10">Ürün bulunamadı</p>
          )}
        </>
      )}
    </div>
  );
}
