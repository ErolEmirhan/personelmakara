import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBranch } from '../../context/BranchContext';
import { useApp } from '../../context/AppContext';
import { useBackHandler } from '../../hooks/useBackButton';
import { fetchFirestoreSales } from '../../services/firebaseService';
import {
  aggregateBreakfastSalesByDay,
  formatDayLabel,
  getTodayDayKey,
} from '../../utils/breakfastSales';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatInt(value) {
  return Number(value || 0).toLocaleString('tr-TR');
}

function HeroMetric({ label, value, unit, highlight, sub }) {
  return (
    <div className="flex flex-col min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">{label}</p>
      <div className="flex items-baseline gap-1 mt-1">
        <span
          className={`font-display font-black tabular-nums leading-none tracking-tight ${
            highlight ? 'text-4xl sm:text-[2.75rem]' : 'text-2xl'
          } text-white`}
        >
          {value}
        </span>
        {unit && (
          <span className={`font-bold ${highlight ? 'text-lg text-white/70' : 'text-sm text-white/55'}`}>
            {unit}
          </span>
        )}
      </div>
      {sub && <p className="text-[11px] font-medium text-white/50 mt-1.5">{sub}</p>}
    </div>
  );
}

function DayChip({ day, active, accent, onSelect }) {
  const [, month, dayNum] = day.dayKey.split('-');
  const monthShort = day.shortLabel.split(' ')[1] || '';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative shrink-0 w-[4.75rem] rounded-[1.15rem] border text-center transition-all duration-ui ease-premium overflow-hidden ${
        active
          ? 'border-white/30 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.45)] scale-[1.04]'
          : 'bg-white/95 border-slate-200/80 shadow-card active:scale-[0.98]'
      }`}
      style={
        active
          ? { background: `linear-gradient(160deg, ${accent} 0%, ${accent}d9 55%, ${accent}aa 100%)` }
          : undefined
      }
    >
      <div className="px-2 pt-2.5 pb-2">
        <p className={`text-[9px] font-bold uppercase tracking-wider ${active ? 'text-white/70' : 'text-slate-400'}`}>
          {monthShort}
        </p>
        <p className={`text-xl font-display font-black tabular-nums leading-none mt-0.5 ${active ? 'text-white' : 'text-slate-800'}`}>
          {Number(dayNum)}
        </p>
        <div
          className={`mt-2 rounded-xl px-1.5 py-1.5 ${
            active ? 'bg-white/18 backdrop-blur-sm' : 'bg-slate-50'
          }`}
        >
          <p className={`text-lg font-black tabular-nums leading-none ${active ? 'text-white' : 'text-slate-900'}`}>
            {formatInt(day.totalQuantity)}
          </p>
          <p className={`text-[8px] font-bold uppercase tracking-wide mt-0.5 ${active ? 'text-white/65' : 'text-slate-400'}`}>
            adet
          </p>
        </div>
        <p className={`text-[10px] font-semibold tabular-nums mt-1.5 ${active ? 'text-white/75' : 'text-slate-500'}`}>
          {formatMoney(day.totalRevenue)} ₺
        </p>
      </div>
    </button>
  );
}

function ProductCard({ item, rank, maxQuantity, accent }) {
  const qtyShare = maxQuantity > 0 ? Math.min(100, (item.quantity / maxQuantity) * 100) : 0;
  const rankStyles = [
    'from-amber-400 to-orange-500 text-white shadow-[0_4px_14px_-4px_rgba(245,158,11,0.55)]',
    'from-slate-300 to-slate-400 text-white',
    'from-orange-300/90 to-amber-400/90 text-white',
  ];

  return (
    <article
      className="relative flex gap-3.5 p-4 rounded-[1.25rem] bg-white border border-slate-100/90 shadow-card animate-stagger-in opacity-0"
      style={{ animationDelay: `${Math.min(rank, 8) * 50}ms` }}
    >
      <div className="shrink-0 flex flex-col items-center gap-1.5">
        {rank < 3 ? (
          <span
            className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black bg-gradient-to-br ${rankStyles[rank]}`}
          >
            {rank + 1}
          </span>
        ) : (
          <span className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-400 bg-slate-100">
            {rank + 1}
          </span>
        )}
        <div
          className="w-[3.35rem] h-[3.35rem] rounded-2xl flex flex-col items-center justify-center border"
          style={{
            background: `linear-gradient(145deg, ${accent}14 0%, ${accent}08 100%)`,
            borderColor: `${accent}22`,
          }}
        >
          <span className="text-2xl font-display font-black tabular-nums leading-none text-slate-900">
            {formatInt(item.quantity)}
          </span>
          <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400 mt-0.5">
            adet
          </span>
        </div>
      </div>

      <div className="flex-1 min-w-0 pt-0.5">
        <h3 className="font-semibold text-[15px] text-slate-900 leading-snug pr-2">
          {item.name}
        </h3>

        <div className="flex flex-wrap items-center gap-2 mt-2">
          {item.giftQuantity > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
              {formatInt(item.giftQuantity)} ikram
            </span>
          )}
          {item.unitPrice > 0 && (
            <span className="text-xs font-semibold text-slate-500 tabular-nums">
              Birim {formatMoney(item.unitPrice)} ₺
            </span>
          )}
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">
            <span>Gün içi pay</span>
            <span className="tabular-nums">%{qtyShare.toFixed(0)}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-premium"
              style={{
                width: `${qtyShare}%`,
                background: `linear-gradient(90deg, ${accent} 0%, ${accent}99 100%)`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="shrink-0 text-right pt-0.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Ciro</p>
        <p className="text-lg font-display font-bold text-slate-900 tabular-nums leading-tight mt-0.5">
          {formatMoney(item.revenue)}
        </p>
        <p className="text-xs font-semibold text-slate-400">₺</p>
      </div>
    </article>
  );
}

function LoadingSkeleton() {
  return (
    <div className="px-4 space-y-4 animate-pulse">
      <div className="h-44 rounded-[1.5rem] bg-slate-200/70" />
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-[4.75rem] h-28 rounded-[1.15rem] bg-slate-200/60 shrink-0" />
        ))}
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-28 rounded-[1.25rem] bg-slate-200/50" />
      ))}
    </div>
  );
}

export function SalesRecordPanel({ open, onClose }) {
  const { theme } = useBranch();
  const { categories, products, showToast } = useApp();
  const accent = theme.accentSolid;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDayKey, setSelectedDayKey] = useState(getTodayDayKey());
  const [aggregated, setAggregated] = useState({
    days: [],
    breakfastCategoryName: null,
    warning: null,
  });

  useBackHandler(open, onClose);

  const loadSales = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const sales = await fetchFirestoreSales({ limitCount: 2500 });
      const result = aggregateBreakfastSalesByDay(sales, products, categories);
      setAggregated(result);
      if (result.warning) {
        setError(result.warning);
      } else if (result.days.length) {
        const hasSelected = result.days.some((d) => d.dayKey === selectedDayKey);
        if (!hasSelected) {
          setSelectedDayKey(result.days[0].dayKey);
        }
      }
    } catch (err) {
      console.error('Satış kaydı yüklenemedi:', err);
      setError(err.message || 'Satış verileri alınamadı');
      showToast('error', 'Hata', 'Satış kaydı yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [categories, products, selectedDayKey, showToast]);

  useEffect(() => {
    if (!open) return;
    loadSales();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedDay = useMemo(
    () => aggregated.days.find((d) => d.dayKey === selectedDayKey) || null,
    [aggregated.days, selectedDayKey]
  );

  const maxProductQuantity = useMemo(() => {
    if (!selectedDay?.products?.length) return 0;
    return Math.max(...selectedDay.products.map((p) => p.quantity));
  }, [selectedDay]);

  const periodStats = useMemo(() => {
    const totalRevenue = aggregated.days.reduce((sum, d) => sum + d.totalRevenue, 0);
    const totalQuantity = aggregated.days.reduce((sum, d) => sum + d.totalQuantity, 0);
    const totalGifts = aggregated.days.reduce((sum, d) => sum + d.giftQuantity, 0);
    return { totalRevenue, totalQuantity, totalGifts };
  }, [aggregated.days]);

  const sortedProducts = useMemo(() => {
    if (!selectedDay?.products) return [];
    return [...selectedDay.products].sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);
  }, [selectedDay]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9500] flex flex-col bg-[#eef1f6]"
      role="dialog"
      aria-modal="true"
      aria-label="Satış kaydı"
    >
      <header className="shrink-0 pt-[env(safe-area-inset-top,0px)] bg-white/90 backdrop-blur-xl border-b border-slate-200/70">
        <div className="flex items-center gap-3 px-4 h-[3.65rem]">
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-10 h-10 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Geri"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-[1.05rem] text-slate-900 tracking-tight">
                Satış Kaydı
              </h1>
              <span
                className="text-[9px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full border"
                style={{ color: accent, borderColor: `${accent}33`, backgroundColor: `${accent}10` }}
              >
                {aggregated.breakfastCategoryName || 'Kahvaltı'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Canlı kasa verisi · gün bazlı özet
            </p>
          </div>
          <button
            type="button"
            onClick={loadSales}
            disabled={loading}
            className="shrink-0 h-10 px-3 rounded-2xl flex items-center gap-1.5 text-xs font-bold active:scale-95 transition-all disabled:opacity-50"
            style={{ backgroundColor: `${accent}12`, color: accent }}
          >
            <svg
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            Yenile
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {loading && !aggregated.days.length ? (
          <LoadingSkeleton />
        ) : error && !aggregated.days.length ? (
          <div className="px-4 py-16 text-center">
            <p className="text-slate-600 font-medium">{error}</p>
            <button
              type="button"
              onClick={loadSales}
              className="mt-4 px-5 py-3 rounded-2xl text-white font-bold text-sm shadow-float"
              style={{ backgroundColor: accent }}
            >
              Tekrar dene
            </button>
          </div>
        ) : !aggregated.days.length ? (
          <div className="px-4 py-20 text-center">
            <div
              className="inline-flex items-center justify-center w-[4.5rem] h-[4.5rem] rounded-[1.35rem] mb-4 text-2xl shadow-card border border-white"
              style={{ background: `linear-gradient(145deg, ${accent}18, white)` }}
            >
              ☕
            </div>
            <p className="font-display font-bold text-lg text-slate-800">Henüz kayıt yok</p>
            <p className="text-sm text-slate-500 mt-2 max-w-[17rem] mx-auto leading-relaxed">
              Kahvaltı satışları kasadan işlendikçe burada günlük adet ve ciro olarak görünür.
            </p>
          </div>
        ) : (
          <>
            <section className="px-4 pt-4 pb-2">
              <div
                className="relative overflow-hidden rounded-[1.5rem] p-5 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.45)]"
                style={{
                  background: `linear-gradient(145deg, ${accent} 0%, ${accent}dd 42%, #1e293b 100%)`,
                }}
              >
                <div
                  className="absolute -top-10 -right-8 w-40 h-40 rounded-full blur-3xl opacity-30 pointer-events-none"
                  style={{ background: '#ffffff' }}
                />
                <div
                  className="absolute bottom-0 left-0 w-32 h-32 rounded-full blur-2xl opacity-20 pointer-events-none"
                  style={{ background: accent }}
                />

                <p className="relative text-[10px] font-bold uppercase tracking-[0.22em] text-white/50">
                  {selectedDay ? formatDayLabel(selectedDay.dayKey) : 'Dönem özeti'}
                </p>

                <div className="relative grid grid-cols-2 gap-5 mt-4">
                  <HeroMetric
                    label="Toplam adet"
                    value={formatInt(selectedDay ? selectedDay.totalQuantity : periodStats.totalQuantity)}
                    unit="adet"
                    highlight
                    sub={
                      selectedDay?.giftQuantity > 0
                        ? `${formatInt(selectedDay.giftQuantity)} ikram dahil`
                        : periodStats.totalGifts > 0
                          ? `${formatInt(periodStats.totalGifts)} ikram (dönem)`
                          : undefined
                    }
                  />
                  <HeroMetric
                    label="Toplam ciro"
                    value={formatMoney(selectedDay ? selectedDay.totalRevenue : periodStats.totalRevenue)}
                    unit="₺"
                    sub={
                      selectedDay
                        ? `${formatInt(selectedDay.saleCount)} işlem · ${formatInt(selectedDay.products.length)} ürün`
                        : `${formatInt(aggregated.days.length)} gün kayıtlı`
                    }
                  />
                </div>
              </div>
            </section>

            <section className="px-4 py-3">
              <div className="flex items-end justify-between mb-3 px-0.5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Günler
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">Adet öne çıkarılmış takvim</p>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  {aggregated.days.length} gün
                </p>
              </div>
              <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                {aggregated.days.map((day) => (
                  <DayChip
                    key={day.dayKey}
                    day={day}
                    active={day.dayKey === selectedDayKey}
                    accent={accent}
                    onSelect={() => setSelectedDayKey(day.dayKey)}
                  />
                ))}
              </div>
            </section>

            {selectedDay && (
              <section className="px-4 pb-6 space-y-3">
                <div className="flex items-center justify-between px-0.5 pt-1">
                  <div>
                    <h2 className="font-display font-bold text-base text-slate-900">
                      Ürün kırılımı
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      Adede göre sıralı · en çok satan üstte
                    </p>
                  </div>
                  <div
                    className="px-3 py-2 rounded-xl text-center border"
                    style={{ backgroundColor: `${accent}08`, borderColor: `${accent}18` }}
                  >
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Gün toplamı</p>
                    <p className="text-xl font-black tabular-nums text-slate-900 leading-none mt-0.5">
                      {formatInt(selectedDay.totalQuantity)}
                    </p>
                  </div>
                </div>

                {sortedProducts.length === 0 ? (
                  <div className="rounded-[1.25rem] bg-white border border-slate-100 py-12 text-center text-sm text-slate-400">
                    Bu gün için ürün kaydı yok
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {sortedProducts.map((item, index) => (
                      <ProductCard
                        key={`${item.name}-${item.unitPrice}`}
                        item={item}
                        rank={index}
                        maxQuantity={maxProductQuantity}
                        accent={accent}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
