import { useEffect, useMemo, useState } from 'react';
import { useBranch } from '../context/BranchContext';
import { useApp } from '../context/AppContext';
import { fetchBranchStaff } from '../services/firebaseService';
import { groupOrderItemsByStaff } from '../components/order/ExistingOrdersPanel';
import { StaffAvatar } from '../components/ui/StaffAvatar';
import {
  adminSectionCardClass,
  adminSectionHeaderClass,
} from '../constants/adminTheme';
import {
  bossSectionCardClass,
  bossSectionHeaderClass,
} from '../constants/bossTheme';
import { BOTTOM_NAV_PADDING } from '../constants/nav';

function collectOrderEntries(tables) {
  const entries = [];
  tables.forEach((table) => {
    if (!table.hasOrder || !Array.isArray(table.items) || table.items.length === 0) return;
    const tableName = table.name || `Masa ${table.number}`;
    table.items.forEach((item, index) => {
      entries.push({
        id: item.id ?? `${table.id}-${index}`,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        price: item.price,
        isGift: item.isGift,
        staff_id: item.staff_id ?? null,
        staff_name: item.staff_name ?? null,
        item_note: item.item_note,
        tableId: table.id,
        tableName,
        sequence: entries.length,
      });
    });
  });
  return entries;
}

export function OrdersScreen() {
  const { theme, branchKey } = useBranch();
  const { tables, loading, selectTable } = useApp();
  const [staffList, setStaffList] = useState([]);

  useEffect(() => {
    if (!branchKey) return;
    fetchBranchStaff(branchKey)
      .then(setStaffList)
      .catch(() => setStaffList([]));
  }, [branchKey]);

  const entries = useMemo(() => collectOrderEntries(tables), [tables]);

  const staffGroups = useMemo(() => {
    const groups = groupOrderItemsByStaff(entries, staffList);
    return groups
      .map((group) => ({
        ...group,
        firstSequence: Math.min(...group.items.map((item) => item.sequence ?? 0)),
      }))
      .sort((a, b) => a.firstSequence - b.firstSequence);
  }, [entries, staffList]);

  const occupiedCount = useMemo(
    () => tables.filter((t) => t.hasOrder).length,
    [tables]
  );

  if (loading && !tables.length) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-[3px] border-pink-100 border-t-pink-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4" style={{ paddingBottom: BOTTOM_NAV_PADDING }}>
      <div className="mb-5 px-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Canlı salon
        </p>
        <h2 className="font-display font-bold text-xl text-slate-900 mt-1 tracking-tight">
          Aktif siparişler
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {occupiedCount} masa · {entries.length} ürün
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16 px-6 rounded-3xl bg-white border border-slate-100 shadow-sm">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="font-semibold text-slate-700">Aktif sipariş yok</p>
          <p className="text-sm text-slate-400 mt-1">Dolu masalardaki siparişler burada görünür.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {staffGroups.map((group) => {
            const isBossGroup = group.is_boss && !group.is_admin;
            const groupTotal = group.items.reduce(
              (sum, item) =>
                sum + (item.isGift ? 0 : (Number(item.price) || 0) * (Number(item.quantity) || 0)),
              0
            );

            return (
              <section
                key={group.key}
                className={
                  group.is_admin
                    ? `${adminSectionCardClass} rounded-[1.35rem]`
                    : isBossGroup
                      ? `${bossSectionCardClass} rounded-[1.35rem]`
                      : 'rounded-[1.35rem] overflow-hidden bg-white border border-slate-100 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.12)]'
                }
              >
                <div className={`flex items-center gap-3 px-4 py-3.5 border-b ${
                  group.is_admin
                    ? adminSectionHeaderClass
                    : isBossGroup
                      ? bossSectionHeaderClass
                      : 'border-slate-50 bg-slate-50/60'
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
                    <p className="font-semibold truncate text-slate-900">
                      {group.displayName}
                    </p>
                    <p className={`text-xs ${
                      group.is_admin
                        ? 'text-amber-800/55 font-medium'
                        : isBossGroup
                          ? 'text-red-800/55 font-medium'
                          : 'text-slate-500'
                    }`}>
                      {group.items.length} ürün · {groupTotal.toFixed(2)} ₺
                    </p>
                  </div>
                </div>

                <ul className="divide-y divide-slate-50">
                  {group.items.map((item) => (
                    <li key={`${item.tableId}-${item.id}`}>
                      <button
                        type="button"
                        onClick={() => {
                          const table = tables.find((t) => t.id === item.tableId);
                          if (table) selectTable(table);
                        }}
                        className="w-full flex items-start gap-3 px-4 py-3.5 text-left active:bg-slate-50/80 transition-colors"
                      >
                        <span
                          className="shrink-0 mt-0.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide"
                          style={{ backgroundColor: `${theme.accentSolid}12`, color: theme.accentSolid }}
                        >
                          {item.tableName}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800">
                            <span className="font-bold text-slate-900">{item.quantity}×</span>{' '}
                            {item.product_name}
                            {item.isGift && (
                              <span className="ml-1.5 text-[11px] font-semibold text-pink-500">İkram</span>
                            )}
                          </p>
                          {item.item_note && (
                            <p className="text-xs text-slate-400 mt-0.5 truncate">{item.item_note}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-sm font-semibold text-slate-600">
                          {item.isGift ? '0' : (Number(item.price) * Number(item.quantity)).toFixed(2)} ₺
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
