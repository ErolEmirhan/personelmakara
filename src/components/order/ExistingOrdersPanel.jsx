import { useEffect, useMemo, useState } from 'react';
import { useBranch } from '../../context/BranchContext';
import { fetchBranchStaff } from '../../services/firebaseService';
import { StaffAvatar } from '../ui/StaffAvatar';
import { staffRolePriority } from '../../utils/staffRole';
import { useBackHandler } from '../../hooks/useBackButton';

function buildStaffLookup(staffList) {
  const byId = new Map();
  const byName = new Map();
  staffList.forEach((s) => {
    byId.set(s.id, s);
    const full = `${s.name || ''} ${s.surname || ''}`.trim().toLowerCase();
    if (full) byName.set(full, s);
  });
  return { byId, byName };
}

function resolveStaffForItem(item, lookup) {
  if (item.staff_id != null && lookup.byId.has(item.staff_id)) {
    return lookup.byId.get(item.staff_id);
  }
  const nameKey = (item.staff_name || '').trim().toLowerCase();
  if (nameKey && lookup.byName.has(nameKey)) {
    return lookup.byName.get(nameKey);
  }
  const parts = (item.staff_name || '').trim().split(/\s+/);
  return {
    name: parts[0] || 'Personel',
    surname: parts.slice(1).join(' ') || '',
    profileImageSrc: null,
  };
}

function formatMoney(value) {
  const amount = Number(value) || 0;
  return `${amount.toFixed(2).replace('.', ',')}\u00a0₺`;
}

function MetaDot() {
  return <span className="text-slate-300 select-none" aria-hidden>·</span>;
}

function ChevronIcon({ open }) {
  return (
    <svg
      className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.25}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function getRoleAccentClass(group) {
  if (group.is_admin) return 'border-l-amber-400';
  if (group.is_boss && !group.is_admin) return 'border-l-rose-400';
  if (group.is_manager) return 'border-l-orange-400';
  if (group.is_chef) return 'border-l-yellow-400';
  return 'border-l-slate-200';
}

function SelectBox({ selected, onToggle, label }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={selected}
      className={`shrink-0 w-[22px] h-[22px] rounded-md border flex items-center justify-center transition-colors ${
        selected
          ? 'bg-red-500 border-red-500 text-white'
          : 'border-slate-300 bg-white'
      }`}
    >
      {selected && (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

export function groupOrderItemsByStaff(items, staffList) {
  const lookup = buildStaffLookup(staffList);
  const groups = new Map();

  items.forEach((item) => {
    const staff = resolveStaffForItem(item, lookup);
    const nameKey = (item.staff_name || '').trim().toLowerCase();
    const key = item.staff_id ?? (nameKey || '__unknown__');
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        staffId: item.staff_id ?? staff?.id ?? null,
        name: staff?.name || (item.staff_name || 'Personel').split(/\s+/)[0],
        surname: staff?.surname || (item.staff_name || '').split(/\s+/).slice(1).join(' '),
        displayName:
          staff?.name && staff?.surname
            ? `${staff.name} ${staff.surname}`
            : item.staff_name || 'Personel',
        profileImageSrc: staff?.profileImageSrc || null,
        is_manager: !!staff?.is_manager,
        is_chef: !!staff?.is_chef,
        is_admin: !!staff?.is_admin,
        is_boss: !!staff?.is_boss,
        items: [],
      });
    }
    groups.get(key).items.push(item);
  });

  return Array.from(groups.values());
}

export function ExistingOrdersPanel({
  items,
  canCancel,
  onCancelItem,
  canBulkCancel,
  onBulkCancel,
}) {
  const { theme, branchKey } = useBranch();
  const [expanded, setExpanded] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [staffList, setStaffList] = useState([]);

  useEffect(() => {
    if (!branchKey || items.length === 0) return;
    fetchBranchStaff(branchKey)
      .then(setStaffList)
      .catch(() => setStaffList([]));
  }, [branchKey, items.length]);

  useEffect(() => {
    if (items.length === 0) {
      setBulkMode(false);
      setSelectedIds(new Set());
    }
  }, [items.length]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const valid = new Set(items.map((item) => item.id));
      const next = new Set([...prev].filter((id) => valid.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [items]);

  const groups = useMemo(() => {
    const list = groupOrderItemsByStaff(items, staffList);
    return list.sort((a, b) => {
      const roleDiff = staffRolePriority(a) - staffRolePriority(b);
      if (roleDiff !== 0) return roleDiff;
      return (a.displayName || '').localeCompare(b.displayName || '', 'tr');
    });
  }, [items, staffList]);

  const exitBulkMode = () => {
    setBulkMode(false);
    setSelectedIds(new Set());
  };

  const startBulkMode = () => {
    setExpanded(true);
    setBulkMode(true);
    setSelectedIds(new Set());
  };

  useBackHandler(items.length > 0 && bulkMode, exitBulkMode);
  useBackHandler(items.length > 0 && expanded && !bulkMode, () => setExpanded(false));

  const totalAmount = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + (item.isGift ? 0 : (Number(item.price) || 0) * (Number(item.quantity) || 0)),
        0
      ),
    [items]
  );

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(item.id)),
    [items, selectedIds]
  );

  const toggleItem = (itemId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(items.map((item) => item.id)));
  };

  if (items.length === 0) return null;

  const isOpen = expanded || bulkMode;

  return (
    <section
      className="mb-3 rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden"
      aria-label="Mevcut siparişler"
    >
      {/* ── Header ── */}
      <div className="px-3.5 py-3 border-b border-slate-100/80">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => !bulkMode && setExpanded((v) => !v)}
            disabled={bulkMode}
            className="flex-1 min-w-0 text-left disabled:cursor-default active:opacity-80 transition-opacity"
            aria-expanded={isOpen}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Mevcut siparişler
            </p>

            {bulkMode ? (
              <p className="mt-1 text-sm font-semibold text-red-600 whitespace-nowrap">
                Toplu iptal modu
              </p>
            ) : (
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-semibold text-slate-900">
                <span className="whitespace-nowrap tabular-nums">{items.length} ürün</span>
                <MetaDot />
                <span className="whitespace-nowrap tabular-nums">{formatMoney(totalAmount)}</span>
                {groups.length > 0 && (
                  <>
                    <MetaDot />
                    <span className="whitespace-nowrap text-slate-500 font-medium">
                      {groups.length} personel
                    </span>
                  </>
                )}
              </p>
            )}
          </button>

          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
            {canBulkCancel && !bulkMode && (
              <button
                type="button"
                onClick={startBulkMode}
                className="h-8 px-2.5 rounded-lg border border-red-500 bg-white text-red-600 text-[11px] font-bold whitespace-nowrap active:bg-red-50 transition-colors"
              >
                Toplu iptal
              </button>
            )}

            {bulkMode && (
              <button
                type="button"
                onClick={exitBulkMode}
                className="h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 text-[11px] font-bold whitespace-nowrap active:bg-slate-100"
              >
                Vazgeç
              </button>
            )}

            {!bulkMode && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 active:bg-slate-50 transition-colors"
                aria-label={isOpen ? 'Siparişleri gizle' : 'Siparişleri göster'}
              >
                <ChevronIcon open={isOpen} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Expanded body ── */}
      {isOpen && (
        <>
          {bulkMode && (
            <div className="px-3.5 py-2.5 flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60">
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs font-semibold text-slate-700 active:opacity-70"
              >
                {allSelected ? 'Seçimi kaldır' : 'Tümünü seç'}
              </button>
              <span className="text-xs font-semibold text-slate-500 tabular-nums whitespace-nowrap">
                {selectedIds.size}/{items.length} seçili
              </span>
            </div>
          )}

          <div className="divide-y divide-slate-100 pb-1">
            {groups.map((group) => {
              const groupTotal = group.items.reduce(
                (sum, item) =>
                  sum + (item.isGift ? 0 : (Number(item.price) || 0) * (Number(item.quantity) || 0)),
                0
              );

              return (
                <div key={group.key} className={`border-l-[3px] ${getRoleAccentClass(group)}`}>
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50/50">
                    <StaffAvatar
                      name={group.name}
                      surname={group.surname}
                      profileImageSrc={group.profileImageSrc}
                      isManager={group.is_manager}
                      isChef={group.is_chef}
                      isAdmin={group.is_admin}
                      isBoss={group.is_boss}
                      size="xs"
                      accent={theme.accent}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {group.displayName}
                      </p>
                      <p className="text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
                        {group.items.length} ürün · {formatMoney(groupTotal)}
                      </p>
                    </div>
                  </div>

                  <ul>
                    {group.items.map((item) => {
                      const selected = selectedIds.has(item.id);
                      const lineTotal = item.isGift
                        ? 0
                        : (Number(item.price) || 0) * (Number(item.quantity) || 0);

                      return (
                        <li
                          key={item.id}
                          className={`flex items-center gap-2.5 px-3.5 py-2.5 ${
                            bulkMode && selected ? 'bg-red-50/70' : 'bg-white'
                          }`}
                        >
                          {bulkMode && (
                            <SelectBox
                              selected={selected}
                              onToggle={() => toggleItem(item.id)}
                              label={selected ? `${item.product_name} seçimini kaldır` : `${item.product_name} seç`}
                            />
                          )}

                          <span className="shrink-0 min-w-[2rem] h-7 px-1.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center tabular-nums">
                            {item.quantity}×
                          </span>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {item.product_name}
                            </p>
                            {item.isGift && (
                              <p className="text-[10px] font-semibold text-emerald-600 mt-0.5">İkram</p>
                            )}
                          </div>

                          <div className="shrink-0 flex flex-col items-end gap-1">
                            <span className="text-sm font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                              {formatMoney(lineTotal)}
                            </span>
                            {canCancel && onCancelItem && !bulkMode && (
                              <button
                                type="button"
                                onClick={() => onCancelItem(item)}
                                className="text-[10px] font-bold text-red-600 px-2.5 py-1 rounded-lg border border-red-500 bg-white active:bg-red-50 transition-colors"
                              >
                                İptal
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3 px-3.5 py-3 border-t border-slate-100 bg-slate-50/40">
            <span className="text-sm font-semibold text-slate-600">Toplam</span>
            <span className="text-base font-bold text-slate-900 tabular-nums whitespace-nowrap">
              {formatMoney(totalAmount)}
            </span>
          </div>

          {bulkMode && (
            <div className="px-3.5 pb-3.5 pt-0">
              <button
                type="button"
                disabled={selectedIds.size === 0}
                onClick={() => {
                  if (selectedIds.size === 0) return;
                  onBulkCancel?.(selectedItems);
                  exitBulkMode();
                }}
                className="w-full h-11 rounded-xl border-2 border-red-500 bg-white text-red-600 text-sm font-bold disabled:opacity-40 active:bg-red-50 transition-colors"
              >
                {selectedIds.size === 0
                  ? 'İptal edilecek ürün seçin'
                  : `${selectedIds.size} ürünü iptal et`}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
