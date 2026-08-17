import { useEffect, useState } from 'react';
import { useBranch } from '../../context/BranchContext';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import {
  approveOrderCall,
  cancelOrderCall,
  subscribeOrderCalls,
} from '../../services/firebaseService';
import {
  formatOrderCallTimestamp,
  orderCallTotal,
  resolveTableForOrderCall,
} from '../../utils/orderCalls';
import { hapticLight, hapticSuccess } from '../../utils/haptic';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function OrderCallCard({ orderCall, table, busyAction, onApprove, onCancel, accentSolid }) {
  const total = orderCallTotal(orderCall);
  const isBusy = !!busyAction;

  return (
    <article className="rounded-[1.35rem] overflow-hidden bg-white border border-slate-100 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.12)]">
      <div className="px-4 py-3.5 border-b border-slate-50 bg-slate-50/70">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Masa siparişi
            </p>
            <p className="font-display font-bold text-lg text-slate-900 mt-0.5">
              {table?.name || orderCall.tableName || `Masa ${orderCall.tableNumber ?? '?'}`}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {formatOrderCallTimestamp(orderCall)}
              {orderCall.source === 'qr-menu' && (
                <span className="ml-1.5 text-violet-600 font-semibold">· QR Menü</span>
              )}
            </p>
          </div>
          <div
            className="shrink-0 px-3 py-2 rounded-xl text-right"
            style={{ backgroundColor: `${accentSolid}12` }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Toplam</p>
            <p className="text-sm font-bold" style={{ color: accentSolid }}>
              {formatMoney(total)} ₺
            </p>
          </div>
        </div>
      </div>

      <ul className="divide-y divide-slate-50 px-4">
        {orderCall.items.map((item, index) => (
          <li key={`${orderCall.id}-${item.id}-${index}`} className="py-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">
                  <span className="font-bold text-slate-900">{item.quantity}×</span>{' '}
                  {item.name}
                  {item.isGift && (
                    <span className="ml-1.5 text-[11px] font-semibold text-pink-500">İkram</span>
                  )}
                </p>
                {item.categoryName && (
                  <p className="text-[11px] text-slate-400 mt-0.5">{item.categoryName}</p>
                )}
                {item.extraNote && (
                  <p className="text-xs text-slate-400 mt-0.5">{item.extraNote}</p>
                )}
              </div>
              <span className="shrink-0 text-sm font-semibold text-slate-600">
                {item.isGift ? '0,00' : formatMoney(item.price * item.quantity)} ₺
              </span>
            </div>
          </li>
        ))}
      </ul>

      {orderCall.orderNote && (
        <div className="mx-4 mb-3 px-3 py-2 rounded-xl bg-amber-50 border border-amber-100">
          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700">Not</p>
          <p className="text-sm text-amber-900 mt-0.5">{orderCall.orderNote}</p>
        </div>
      )}

      {!table && (
        <div className="mx-4 mb-3 px-3 py-2 rounded-xl bg-red-50 border border-red-100">
          <p className="text-xs font-medium text-red-700">
            Masa bulunamadı (No: {orderCall.tableNumber ?? '—'}). Onaylamadan önce masa listesini kontrol edin.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 p-4 pt-1 border-t border-slate-50">
        <button
          type="button"
          disabled={isBusy || !table}
          onClick={() => onApprove(orderCall, table)}
          className="py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-45 active:scale-[0.98] transition-transform"
        >
          {busyAction === 'approve' ? 'Onaylanıyor…' : 'Onayla'}
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onCancel(orderCall)}
          className="py-3 rounded-xl bg-white text-red-600 border border-red-200 text-sm font-bold disabled:opacity-45 active:scale-[0.98] transition-transform"
        >
          {busyAction === 'cancel' ? 'Siliniyor…' : 'İptal'}
        </button>
      </div>
    </article>
  );
}

export function OrderCallsPanel({ theme }) {
  const { branchKey } = useBranch();
  const { staff } = useAuth();
  const { tables, showToast, loadData } = useApp();
  const [orderCalls, setOrderCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [busyAction, setBusyAction] = useState(null);

  useEffect(() => {
    if (!branchKey) {
      setOrderCalls([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const unsub = subscribeOrderCalls(branchKey, (rows) => {
      setOrderCalls(rows);
      setLoading(false);
    });

    return () => unsub();
  }, [branchKey]);

  const handleApprove = async (orderCall, table) => {
    if (!staff || !table || busyId) return;
    setBusyId(orderCall.id);
    setBusyAction('approve');
    hapticLight();

    try {
      const result = await approveOrderCall(orderCall, staff, table);
      if (result.success) {
        hapticSuccess();
        showToast('success', 'Onaylandı', `${table.name} masasına sipariş gönderildi`);
        await loadData();
      } else {
        showToast('error', 'Hata', result.error || 'Sipariş onaylanamadı');
      }
    } catch (err) {
      showToast('error', 'Hata', err.message || 'Sipariş onaylanamadı');
    } finally {
      setBusyId(null);
      setBusyAction(null);
    }
  };

  const handleCancel = async (orderCall) => {
    if (!orderCall?.id || busyId) return;
    setBusyId(orderCall.id);
    setBusyAction('cancel');
    hapticLight();

    try {
      const result = await cancelOrderCall(orderCall.id);
      if (result.success) {
        showToast('success', 'Silindi', 'Masa siparişi iptal edildi');
      } else {
        showToast('error', 'Hata', result.error || 'Sipariş silinemedi');
      }
    } catch (err) {
      showToast('error', 'Hata', err.message || 'Sipariş silinemedi');
    } finally {
      setBusyId(null);
      setBusyAction(null);
    }
  };

  return (
    <>
      <div className="mb-5 px-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
          QR / uzaktan
        </p>
        <h2 className="font-display font-bold text-xl text-slate-900 mt-1 tracking-tight">
          Masa siparişleri
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {orderCalls.length} bekleyen çağrı
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-10 h-10 border-[3px] border-violet-100 border-t-violet-500 rounded-full animate-spin" />
        </div>
      ) : orderCalls.length === 0 ? (
        <div className="text-center py-16 px-6 rounded-3xl bg-white border border-slate-100 shadow-sm">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513M15 12.75H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="font-semibold text-slate-700">Bekleyen masa siparişi yok</p>
          <p className="text-sm text-slate-400 mt-1">OrderCalls koleksiyonundaki yeni talepler burada görünür.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orderCalls.map((orderCall) => {
            const table = resolveTableForOrderCall(orderCall, tables);
            return (
              <OrderCallCard
                key={orderCall.id}
                orderCall={orderCall}
                table={table}
                busyAction={busyId === orderCall.id ? busyAction : null}
                onApprove={handleApprove}
                onCancel={handleCancel}
                accentSolid={theme.accentSolid}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
