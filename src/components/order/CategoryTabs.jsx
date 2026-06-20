import { useMemo, useRef, useEffect } from 'react';
import { useBranch } from '../../context/BranchContext';

export function CategoryTabs({ categories, products, selectedCategory, onSelect }) {
  const { theme } = useBranch();
  const scrollRef = useRef(null);
  const activeRef = useRef(null);

  const counts = useMemo(() => {
    const map = new Map();
    products.forEach((p) => {
      map.set(p.category_id, (map.get(p.category_id) || 0) + 1);
    });
    return map;
  }, [products]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selectedCategory]);

  if (!categories.length) return null;

  return (
    <div className="relative mb-4 -mx-4">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-gray-50 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-gray-50 to-transparent"
        aria-hidden
      />

      <div
        ref={scrollRef}
        className="overflow-x-auto px-4 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex gap-2 min-w-max snap-x snap-mandatory">
          {categories.map((cat) => {
            const active = selectedCategory === cat.id;
            const count = counts.get(cat.id) || 0;

            return (
              <button
                key={cat.id}
                ref={active ? activeRef : null}
                type="button"
                onClick={() => onSelect(cat.id)}
                className={`snap-start shrink-0 inline-flex items-center gap-2 pl-4 pr-3.5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] ${
                  active
                    ? `text-white shadow-[0_10px_28px_-10px] bg-gradient-to-r ${theme.accent}`
                    : 'text-slate-600 bg-white border border-slate-200/90 shadow-[0_2px_12px_-6px_rgba(15,23,42,0.12)] hover:border-slate-300/90'
                }`}
                style={active ? { boxShadow: `0 10px 28px -10px ${theme.accentSolid}55` } : undefined}
                aria-pressed={active}
              >
                <span>{cat.name}</span>
                {count > 0 && (
                  <span
                    className={`min-w-[1.375rem] h-[1.375rem] px-1 rounded-lg text-[10px] font-bold tabular-nums flex items-center justify-center ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
