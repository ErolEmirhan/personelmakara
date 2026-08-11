import { useState } from 'react';
import { useBranch } from '../../context/BranchContext';

function PlaceholderArt({ accentSolid, compact = false }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background: `linear-gradient(145deg, ${accentSolid}18 0%, ${accentSolid}08 45%, #f8fafc 100%)`,
      }}
    >
      <svg
        className={compact ? 'w-8 h-8 opacity-[0.22]' : 'w-14 h-14 opacity-[0.22]'}
        viewBox="0 0 24 24"
        fill="none"
        stroke={accentSolid}
        strokeWidth="1.2"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3c-1.5 2.2-4 3.8-4 7.2 0 2.8 1.8 4.8 4 4.8s4-2 4-4.8c0-3.4-2.5-5-4-7.2z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8M9 18h6" />
      </svg>
    </div>
  );
}

export function ProductCard({ product, onAdd, compact = false }) {
  const { theme } = useBranch();
  const [justAdded, setJustAdded] = useState(false);
  const outOfStock = product.trackStock && product.stock <= 0;
  const lowStock = product.trackStock && product.stock > 0 && product.stock <= 5;
  const imageSrc = product.imageSrc || null;
  const price = Number(product.price).toFixed(2);

  const handleAdd = () => {
    if (outOfStock) return;
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 450);
    onAdd(product);
  };

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={outOfStock}
      className={`group relative flex flex-col w-full min-w-0 bg-white overflow-hidden text-left transition-all duration-ui ease-premium border border-slate-100/90 shadow-card disabled:cursor-not-allowed ${
        compact ? 'rounded-xl' : 'rounded-[1.35rem]'
      } ${
        outOfStock
          ? 'opacity-75'
          : 'active:scale-[0.98] hover:shadow-card-hover hover:border-slate-200/90'
      }`}
      aria-label={`${product.name} — ${price} ₺`}
    >
      <div className={`relative w-full overflow-hidden bg-gray-100 ${compact ? 'aspect-square' : 'aspect-[5/4]'}`}>
        {imageSrc ? (
          <img
            src={imageSrc}
            alt=""
            loading="lazy"
            decoding="async"
            className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out ${
              outOfStock ? 'grayscale-[0.65] brightness-90' : 'group-hover:scale-[1.04]'
            }`}
          />
        ) : (
          <PlaceholderArt accentSolid={theme.accentSolid} compact={compact} />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent pointer-events-none" />

        {product.trackStock && !outOfStock && (
          <span
            className={`absolute z-[2] font-bold uppercase tracking-wide rounded-md backdrop-blur-md border ${
              compact
                ? 'top-1 left-1 text-[8px] px-1 py-0.5'
                : 'top-2.5 left-2.5 text-[10px] px-2 py-1 rounded-lg'
            } ${
              lowStock
                ? 'bg-amber-500/90 text-white border-amber-400/50'
                : 'bg-white/90 text-gray-700 border-white/60'
            }`}
          >
            {compact ? product.stock : `Stok ${product.stock}`}
          </span>
        )}

        {outOfStock && (
          <div className="absolute inset-0 z-[3] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px]">
            <span className={`rounded-full bg-white/95 text-gray-800 font-bold tracking-wide shadow-lg ${
              compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'
            }`}>
              Tükendi
            </span>
          </div>
        )}

        {!outOfStock && (
          <span
            className={`absolute z-[2] rounded-full bg-gradient-to-br ${theme.accent} text-white shadow-lg shadow-black/20 flex items-center justify-center ring-2 ring-white/90 transition-transform duration-ui ease-premium group-active:scale-90 ${
              compact ? 'bottom-1.5 right-1.5 w-7 h-7' : 'bottom-2.5 right-2.5 w-9 h-9'
            } ${justAdded ? 'animate-add-pulse' : ''}`}
            aria-hidden
          >
            <svg className={compact ? 'w-4 h-4' : 'w-5 h-5'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </span>
        )}
      </div>

      <div className={`flex flex-col flex-1 min-w-0 ${compact ? 'px-1.5 pt-1.5 pb-2 gap-0.5' : 'px-3 pt-3 pb-3.5 gap-1.5'}`}>
        <h3 className={`font-semibold text-gray-900 line-clamp-2 ${
          compact ? 'text-[10px] leading-tight min-h-[1.65rem]' : 'text-[13px] leading-snug min-h-[2.35rem]'
        }`}>
          {product.name}
        </h3>

        <div className={`flex items-end justify-between gap-1 mt-auto ${compact ? '' : 'gap-2'}`}>
          <div className="min-w-0">
            {!compact && (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Fiyat</p>
            )}
            <p className={`font-display font-bold leading-none tabular-nums ${compact ? 'text-[12px]' : 'text-lg'}`}>
              <span className={`bg-gradient-to-r ${theme.accent} bg-clip-text text-transparent`}>
                {price}
              </span>
              {!compact && <span className="text-sm font-semibold text-gray-500 ml-0.5">₺</span>}
              {compact && <span className="text-[10px] font-semibold text-gray-500">₺</span>}
            </p>
          </div>

          {!outOfStock && !compact && (
            <span className="shrink-0 text-[10px] font-bold text-gray-400 uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
              Ekle
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
