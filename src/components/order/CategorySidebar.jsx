import { useEffect, useState } from 'react';
import { sortCategoriesByPreference } from '../../utils/categoryOrder';
import {
  buildSidebarCategories,
  isBestSellersCategory,
} from '../../utils/bestSellers';
import { MenuOrderSheet } from './MenuOrderSheet';

const SIDEBAR_WIDTH = '7.75rem';

function EditMenuIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
      />
    </svg>
  );
}

export function CategorySidebar({
  categories,
  products,
  selectedCategory,
  onSelect,
  staffId,
  branchKey,
  theme,
  bestSellersEnabled,
  onMenuOrderChange,
  onBestSellersChange,
}) {
  const [orderEditorOpen, setOrderEditorOpen] = useState(false);
  const [ordered, setOrdered] = useState([]);

  useEffect(() => {
    setOrdered(
      buildSidebarCategories(
        categories,
        staffId,
        branchKey,
        bestSellersEnabled,
        sortCategoriesByPreference
      )
    );
  }, [categories, staffId, branchKey, bestSellersEnabled]);

  const handleCategoriesSaved = (next) => {
    setOrdered(
      buildSidebarCategories(
        next,
        staffId,
        branchKey,
        bestSellersEnabled,
        (_cats, sid, bkey) => sortCategoriesByPreference(next, sid, bkey)
      )
    );
  };

  return (
    <>
      <aside
        className="shrink-0 overflow-y-auto scrollbar-hide border-r border-slate-200/90 bg-white/90 backdrop-blur-md shadow-[inset_-1px_0_0_rgba(255,255,255,0.6)] pl-2.5 pr-2"
        style={{ width: SIDEBAR_WIDTH }}
      >
        <div className="py-3 flex flex-col gap-2">
          <div className="px-1 flex items-center justify-center gap-1.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Menü
            </p>
            <button
              type="button"
              onClick={() => setOrderEditorOpen(true)}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 bg-slate-100/80 border border-slate-200/80 active:scale-95 transition-transform"
              aria-label="Menü sıralamasını düzenle"
              title="Sıralamayı düzenle"
            >
              <EditMenuIcon />
            </button>
          </div>

          {ordered.map((cat) => {
            const active = selectedCategory === cat.id;
            const isBestSellers = isBestSellersCategory(cat.id);

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelect(cat.id)}
                className={`relative w-full min-h-[4.25rem] px-2 py-3 rounded-2xl text-[14px] leading-[1.15] font-bold text-center transition-all duration-150 active:scale-[0.98] ${
                  active
                    ? 'text-white shadow-lg scale-[1.02]'
                    : isBestSellers
                      ? 'bg-amber-50 text-amber-900 border border-amber-200/90 shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-100 shadow-sm hover:border-slate-200'
                }`}
                style={
                  active
                    ? {
                        background: isBestSellers
                          ? 'linear-gradient(145deg, #f59e0b 0%, #d97706 100%)'
                          : `linear-gradient(145deg, ${theme.accentSolid} 0%, ${theme.accentSolid}cc 100%)`,
                        boxShadow: isBestSellers
                          ? '0 10px 24px -12px rgba(245, 158, 11, 0.45)'
                          : `0 10px 24px -12px ${theme.accentSolid}88`,
                      }
                    : undefined
                }
              >
                <span className="line-clamp-3 break-words">
                  {isBestSellers ? `🔥 ${cat.name}` : cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <MenuOrderSheet
        open={orderEditorOpen}
        onClose={() => setOrderEditorOpen(false)}
        categories={categories}
        products={products}
        staffId={staffId}
        branchKey={branchKey}
        theme={theme}
        selectedCategory={selectedCategory}
        bestSellersEnabled={bestSellersEnabled}
        onCategoriesSaved={handleCategoriesSaved}
        onProductsSaved={onMenuOrderChange}
        onBestSellersChange={onBestSellersChange}
      />
    </>
  );
}
