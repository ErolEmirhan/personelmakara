import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBranch } from '../../context/BranchContext';
import { fetchBranchStaff, fetchFirestoreSales } from '../../services/firebaseService';
import { groupOrderItemsByStaff } from '../order/ExistingOrdersPanel';
import { StaffAvatar } from '../ui/StaffAvatar';
import {
  adminSectionCardClass,
  adminSectionHeaderClass,
} from '../../constants/adminTheme';
import {
  bossSectionCardClass,
  bossSectionHeaderClass,
} from '../../constants/bossTheme';
import {
  managerBadgeClass,
  managerCardClass,
} from '../../constants/managerTheme';
import {
  buildSaleDisplayRows,
  getTodayDayKey,
  summarizeDaySales,
} from '../../utils/dailySalesHistory';
import { staffRolePriority } from '../../utils/staffRole';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function SaleItemRow({ item }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800">
          <span className="font-bold text-slate-900">{item.quantity}×</span>{' '}
          {item.product_name}
          {item.isGift && (
            <span className="ml-1.5 text-[11px] font-semibold text-pink-500">İkram</span>
          )}
        </p>
        {item.item_note && (
          <p className="text-xs text-slate-400 mt-0.5">{item.item_note}</p>
        )}
      </div>
      <span className="shrink-0 text-sm font-semibold text-slate-600">
        {item.isGift ? '0,00' : formatMoney(item.price * item.quantity)} ₺
      </span>
    </div>
  );
}

function SaleCard({ row, expanded, onToggle, staffList, theme }) {
  const staffGroups = useMemo(() => {
    const groups = groupOrderItemsByStaff(
      row.items.map((item, index) => ({
        ...item,
        id: `${row.id}-${index}`,
      })),
      staffList
    );
    return groups.sort((a, b) => {
      const roleDiff = staffRolePriority(a) - staffRolePriority(b);
      if (roleDiff !== 0) return roleDiff;
      return (a.displayName || '').localeCompare(b.displayName || '', 'tr');
    });
  }, [row.items, row.id, staffList]);

  return (
    <article className="rounded-[1.35rem] overflow-hidden bg-white border border-slate-100 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.12)]">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-4 text-left active:bg-slate-50/80 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-start gap-3">
          <div
            className="shrink-0 w-12 h-12 rounded-2xl flex flex-col items-center justify-center text-white shadow-sm"
            style={{ background: `linear-gradient(145deg, ${theme.accentSolid} 0%, ${theme.accentSolid}cc 100%)` }}
          >
            <span className="text-[10px] font-bold uppercase tracking-wide opacity-80">Saat</span>
            <span className="text-sm font-black tabular-nums leading-none">{row.clock}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-display font-bold text-slate-900 truncate">{row.tableName}</p>
              <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                Tamamlandı
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {row.itemCount} ürün · {formatMoney(row.totalAmount)} ₺ · {row.paymentLabel}
            </p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              Adisyonu kapatan: <span className="font-semibold text-slate-600">{row.completedBy}</span>
            </p>
          </div>

          <svg
            className={`w-5 h-5 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-3 space-y-4">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-white border border-slate-100 px-3 py-2.5">
              <p className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">Masa</p>
              <p className="font-bold text-slate-800 mt-0.5">{row.tableName}</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-100 px-3 py-2.5">
              <p className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">Saat</p>
              <p className="font-bold text-slate-800 mt-0.5">{row.clock}</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-100 px-3 py-2.5">
              <p className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">Ödeme</p>
              <p className="font-bold text-slate-800 mt-0.5">{row.paymentLabel}</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-100 px-3 py-2.5">
              <p className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">Kapatan personel</p>
              <p className="font-bold text-slate-800 mt-0.5 truncate">{row.completedBy}</p>
            </div>
          </div>

          {staffGroups.map((group) => {
            const isBossGroup = group.is_boss && !group.is_admin;
            const isManagerGroup = group.is_manager && !group.is_admin && !isBossGroup;
            const groupTotal = group.items.reduce(
              (sum, item) =>
                sum + (item.isGift ? 0 : (Number(item.price) || 0) * (Number(item.quantity) || 0)),
              0
            );

            return (
              <section
                key={`${row.id}-${group.key}`}
                className={
                  group.is_admin
                    ? `${adminSectionCardClass} rounded-2xl`
                    : isBossGroup
                      ? `${bossSectionCardClass} rounded-2xl`
                      : isManagerGroup
                        ? `${managerCardClass} rounded-2xl`
                        : 'rounded-2xl overflow-hidden bg-white border border-slate-100'
                }
              >
                <div className={`flex items-center gap-3 px-3.5 py-3 border-b ${
                  group.is_admin
                    ? adminSectionHeaderClass
                    : isBossGroup
                      ? bossSectionHeaderClass
                      : isManagerGroup
                        ? 'border-orange-100/80 bg-orange-50/50'
                        : 'border-slate-50 bg-white'
                }`}>
                  <StaffAvatar
                    name={group.name}
                    surname={group.surname}
                    profileImageSrc={group.profileImageSrc}
                    isManager={group.is_manager}
                    isChef={group.is_chef}
                    isAdmin={group.is_admin}
                    isBoss={group.is_boss}
                    size="sm"
                    accent={theme.accent}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold truncate text-slate-900 text-sm">
                        {group.displayName}
                      </p>
                      {isManagerGroup && (
                        <span className={managerBadgeClass}>Müdür</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Bu personelin aldığı · {group.items.length} kalem · {formatMoney(groupTotal)} ₺
                    </p>
                  </div>
                </div>

                <div className="px-3.5 divide-y divide-slate-50">
                  {group.items.map((item) => (
                    <SaleItemRow
                      key={`${row.id}-${group.key}-${item.id}`}
                      item={item}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          <div className="flex items-center justify-between rounded-2xl bg-white border border-slate-100 px-4 py-3">
            <span className="text-sm font-semibold text-slate-600">Satış toplamı</span>
            <span className="text-base font-black text-slate-900 tabular-nums">
              {formatMoney(row.totalAmount)} ₺
            </span>
          </div>
        </div>
      )}
    </article>
  );
}

export function PastSalesPanel() {
  const { theme, branchKey } = useBranch();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sales, setSales] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [salesRows, staffRows] = await Promise.all([
        fetchFirestoreSales({ limitCount: 2500 }),
        branchKey ? fetchBranchStaff(branchKey) : Promise.resolve([]),
      ]);
      setSales(salesRows);
      setStaffList(staffRows);
    } catch {
      setError('Satış kayıtları yüklenemedi');
      setSales([]);
    } finally {
      setLoading(false);
    }
  }, [branchKey]);

  useEffect(() => {
    load();
  }, [load]);

  const dayKey = getTodayDayKey();
  const rows = useMemo(() => buildSaleDisplayRows(sales, dayKey), [sales, dayKey]);
  const summary = useMemo(() => summarizeDaySales(rows.map((row) => row.sale)), [rows]);

  const toggleExpanded = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-[3px] border-pink-100 border-t-pink-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 px-6 rounded-3xl bg-white border border-slate-100 shadow-sm">
        <p className="font-semibold text-slate-700">{error}</p>
        <button
          type="button"
          onClick={load}
          className="mt-4 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold"
        >
          Tekrar dene
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="px-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Bugün
        </p>
        <h2 className="font-display font-bold text-xl text-slate-900 mt-1 tracking-tight">
          Geçmiş satışlar
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {summary.saleCount} satış · {formatMoney(summary.totalRevenue)} ₺
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 px-6 rounded-3xl bg-white border border-slate-100 shadow-sm">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="font-semibold text-slate-700">Bugün tamamlanan satış yok</p>
          <p className="text-sm text-slate-400 mt-1">Kapanan adisyonlar burada listelenir.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <SaleCard
              key={row.id}
              row={row}
              expanded={expandedId === row.id}
              onToggle={() => toggleExpanded(row.id)}
              staffList={staffList}
              theme={theme}
            />
          ))}
        </div>
      )}
    </div>
  );
}
