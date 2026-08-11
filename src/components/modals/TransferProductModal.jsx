import { useEffect, useMemo, useState } from 'react';
import { getTableOrderItems, submitAndWaitMobileAction } from '../../services/firebaseService';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { TablePickerGrid } from '../tables/TablePickerGrid';
import { TableOpsModalShell, TableSummaryCard, StepIndicator } from './TableOpsModalShell';

function formatMoney(value) {
  const amount = Number(value) || 0;
  return `${amount.toFixed(2).replace('.', ',')}\u00a0₺`;
}

function ItemSelectRow({ item, selected, onToggle }) {
  const lineTotal = item.isGift
    ? 0
    : (Number(item.price) || 0) * (Number(item.quantity) || 0);

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-colors ${
        selected
          ? 'border-teal-500 bg-teal-50/80 ring-1 ring-teal-500/30'
          : 'border-gray-100 bg-white active:bg-gray-50'
      }`}
    >
      <span
        className={`shrink-0 w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center ${
          selected ? 'bg-teal-600 border-teal-600 text-white' : 'border-gray-300 bg-white'
        }`}
        aria-hidden
      >
        {selected && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 leading-snug break-words">
          <span className="text-teal-700">{item.quantity}×</span> {item.product_name}
        </p>
        {item.isGift && (
          <p className="text-[10px] font-semibold text-emerald-600 mt-0.5">İkram</p>
        )}
        {item.staff_name && (
          <p className="text-[11px] text-gray-400 mt-0.5 truncate">{item.staff_name}</p>
        )}
      </div>
      <span className="shrink-0 text-sm font-bold text-gray-700 tabular-nums whitespace-nowrap">
        {formatMoney(lineTotal)}
      </span>
    </button>
  );
}

export function TransferProductModal({ open, onClose }) {
  const { tables, selectedTable, loadData, showToast } = useApp();
  const { staff } = useAuth();
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [sourceItems, setSourceItems] = useState([]);
  const [selectedItemIds, setSelectedItemIds] = useState(() => new Set());

  useEffect(() => {
    if (!open) {
      setSourceId('');
      setTargetId('');
      setStep(1);
      setSourceItems([]);
      setSelectedItemIds(new Set());
      return;
    }
    if (selectedTable?.hasOrder) {
      setSourceId(selectedTable.id);
    } else {
      setSourceId('');
    }
  }, [open, selectedTable?.id, selectedTable?.hasOrder]);

  useEffect(() => {
    if (!open || !sourceId) {
      setSourceItems([]);
      setSelectedItemIds(new Set());
      return undefined;
    }

    let cancelled = false;
    setItemsLoading(true);
    getTableOrderItems(sourceId)
      .then((list) => {
        if (!cancelled) {
          setSourceItems(list);
          setSelectedItemIds(new Set());
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSourceItems([]);
          showToast('error', 'Hata', 'Masa siparişleri yüklenemedi');
        }
      })
      .finally(() => {
        if (!cancelled) setItemsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, sourceId, showToast]);

  const sourceTable = useMemo(
    () => tables.find((t) => String(t.id) === String(sourceId)),
    [tables, sourceId]
  );

  const targetTable = useMemo(
    () => tables.find((t) => String(t.id) === String(targetId)),
    [tables, targetId]
  );

  const selectedItems = useMemo(
    () => sourceItems.filter((item) => selectedItemIds.has(item.id)),
    [sourceItems, selectedItemIds]
  );

  const allItemsSelected =
    sourceItems.length > 0 && selectedItemIds.size === sourceItems.length;

  const toggleItem = (itemId) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const toggleAllItems = () => {
    setSelectedItemIds(
      allItemsSelected ? new Set() : new Set(sourceItems.map((item) => item.id))
    );
  };

  const handleSourceSelect = (table) => {
    setSourceId(table.id);
    setTargetId('');
    setStep(2);
  };

  const handleTransfer = async () => {
    if (!sourceTable || !targetId || !selectedItems.length || !staff) {
      showToast('error', 'Hata', 'Kaynak, hedef ve en az bir ürün seçin');
      return;
    }
    if (String(sourceTable.id) === String(targetId)) {
      showToast('error', 'Hata', 'Kaynak ve hedef masa farklı olmalı');
      return;
    }

    setLoading(true);
    try {
      const res = await submitAndWaitMobileAction({
        type: 'transfer_items',
        sourceTableId: String(sourceTable.id),
        targetTableId: String(targetId),
        items: selectedItems.map((item) => ({
          itemId: item.id,
          productId: item.product_id ?? null,
          productName: item.product_name,
          quantity: item.quantity || 1,
          price: item.price,
          isGift: !!item.isGift,
        })),
        staffId: staff.id,
        staffName: `${staff.name} ${staff.surname}`,
        staffIsManager: !!staff.is_manager,
        staffIsAdmin: !!staff.is_admin,
        staffIsBoss: !!staff.is_boss,
      });

      if (res.success) {
        showToast(
          'success',
          'Başarılı',
          `${selectedItems.length} ürün aktarıldı`
        );
        await loadData({ force: true });
        onClose();
      } else {
        showToast('error', 'Hata', res.error || 'Ürünler aktarılamadı');
      }
    } catch (err) {
      showToast('error', 'Hata', err.message || 'Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  const canGoStep3 = selectedItems.length > 0 && !itemsLoading;
  const canSubmit = sourceTable && targetId && selectedItems.length > 0 && !loading;

  return (
    <TableOpsModalShell
      open={open}
      onClose={onClose}
      title="Ürün Aktar"
      subtitle="Seçili ürünleri başka masaya taşıyın"
      icon="📦"
      accent="from-teal-600 via-cyan-600 to-sky-600"
      footer={
        <div className="space-y-2">
          {sourceTable && targetTable && selectedItems.length > 0 && (
            <p className="text-center text-xs text-gray-500 font-medium">
              Masa <span className="text-gray-800 font-bold">{sourceTable.number}</span>
              {' → '}
              <span className="text-teal-700 font-bold">{targetTable.number}</span>
              {' · '}
              <span className="text-gray-700">{selectedItems.length} ürün</span>
            </p>
          )}
          <div className="flex gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={loading}
                className="shrink-0 px-4 py-3.5 rounded-2xl bg-white border border-gray-200 text-gray-600 font-bold text-sm active:scale-[0.98]"
              >
                Geri
              </button>
            )}
            <button
              type="button"
              onClick={
                step === 1
                  ? () => sourceId && setStep(2)
                  : step === 2
                    ? () => canGoStep3 && setStep(3)
                    : handleTransfer
              }
              disabled={
                step === 1
                  ? !sourceId
                  : step === 2
                    ? !canGoStep3
                    : !canSubmit
              }
              className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-bold text-[15px] shadow-lg shadow-teal-500/25 disabled:opacity-40 disabled:shadow-none active:scale-[0.98] transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Aktarılıyor...
                </span>
              ) : step === 1 ? (
                'Devam Et'
              ) : step === 2 ? (
                'Hedef Masayı Seç'
              ) : (
                `${selectedItems.length} Ürünü Aktar`
              )}
            </button>
          </div>
        </div>
      }
    >
      <StepIndicator steps={['Kaynak', 'Ürünler', 'Hedef']} current={step} />

      {step === 1 && (
        <div>
          <p className="text-sm text-gray-500 mb-3 leading-relaxed">
            Ürün alınacak dolu masayı seçin.
          </p>
          <TablePickerGrid
            tables={tables}
            selectedId={sourceId}
            onSelect={handleSourceSelect}
            filterMode="occupied"
            emptyMessage="Dolu masa bulunamadı"
          />
        </div>
      )}

      {step === 2 && (
        <>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-700">Kaynak masa</p>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-bold text-teal-600 px-2 py-1 rounded-lg hover:bg-teal-50"
              >
                Değiştir
              </button>
            </div>
            <TableSummaryCard table={sourceTable} role="source" />
          </div>

          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="text-sm font-semibold text-gray-700">Aktarılacak ürünler</p>
            {sourceItems.length > 0 && (
              <button
                type="button"
                onClick={toggleAllItems}
                className="text-xs font-bold text-teal-600 px-2 py-1 rounded-lg hover:bg-teal-50"
              >
                {allItemsSelected ? 'Seçimi kaldır' : 'Tümünü seç'}
              </button>
            )}
          </div>

          {itemsLoading ? (
            <div className="py-10 flex justify-center">
              <span className="w-7 h-7 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
            </div>
          ) : sourceItems.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Bu masada ürün bulunamadı</p>
          ) : (
            <div className="space-y-2">
              {sourceItems.map((item) => (
                <ItemSelectRow
                  key={item.id}
                  item={item}
                  selected={selectedItemIds.has(item.id)}
                  onToggle={() => toggleItem(item.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {step === 3 && (
        <>
          <div className="mb-4 rounded-xl bg-teal-50 border border-teal-100 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-teal-600 mb-1">
              Aktarılacak
            </p>
            <ul className="space-y-1">
              {selectedItems.map((item) => (
                <li key={item.id} className="text-sm text-gray-800 leading-snug break-words">
                  <span className="font-bold text-teal-700">{item.quantity}×</span>{' '}
                  {item.product_name}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Hedef masa</p>
            <TablePickerGrid
              tables={tables}
              selectedId={targetId}
              onSelect={(t) => setTargetId(t.id)}
              filterMode="all"
              excludeIds={sourceId ? [sourceId] : []}
              emptyMessage="Uygun masa bulunamadı"
            />
          </div>

          {targetTable && (
            <div className="mt-4">
              <TableSummaryCard table={targetTable} role="target" />
            </div>
          )}
        </>
      )}
    </TableOpsModalShell>
  );
}
