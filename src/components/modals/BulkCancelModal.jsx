import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { cancelOrderItems } from '../../utils/cancelOrderItem';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

export function BulkCancelModal({ open, items, tableId, onClose, onComplete }) {
  const { staff } = useAuth();
  const { showToast, optimisticallyCancelOrderItem, loadExistingOrders } = useApp();
  const [reason, setReason] = useState('');
  const [inlineError, setInlineError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setInlineError('');
      setSubmitting(false);
    }
  }, [open, items]);

  const handleConfirm = async () => {
    if (!items?.length || !tableId || !staff || submitting) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      setInlineError('İptal açıklaması zorunludur');
      showToast('error', 'Gerekli', 'İptal açıklaması zorunludur');
      return;
    }

    const snapshots = items.map((item) => ({ ...item }));
    setSubmitting(true);

    snapshots.forEach((item) => {
      optimisticallyCancelOrderItem(item.id, item.quantity || 1);
    });
    onClose();
    onComplete?.();
    showToast('success', 'Toplu iptal', `${snapshots.length} ürün iptal ediliyor…`);

    let failed = 0;
    for (const item of snapshots) {
      try {
        const res = await cancelOrderItems({
          item,
          tableId,
          staff,
          cancelQty: item.quantity || 1,
          reason: trimmed,
        });
        if (!res.success) failed += 1;
      } catch {
        failed += 1;
      }
    }

    if (failed > 0) {
      showToast('error', 'Kısmi hata', `${failed} ürün iptal edilemedi, liste yenileniyor`);
      loadExistingOrders(tableId);
    }
    setSubmitting(false);
  };

  if (!items?.length) return null;

  const totalQty = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

  return (
    <Modal open={open} onClose={submitting ? undefined : onClose} title="Toplu İptal">
      <p className="text-gray-600 mt-1 mb-3 text-sm leading-relaxed">
        <strong>{items.length}</strong> kalem · toplam <strong>{totalQty}</strong> adet iptal edilecek.
      </p>

      <ul className="max-h-40 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50 divide-y divide-gray-100 mb-4">
        {items.map((item) => (
          <li key={item.id} className="px-3 py-2 text-sm text-gray-800">
            <span className="font-bold text-emerald-700">{item.quantity}×</span>{' '}
            {item.product_name}
          </li>
        ))}
      </ul>

      <input
        type="text"
        value={reason}
        onChange={(e) => {
          setReason(e.target.value);
          if (inlineError) setInlineError('');
        }}
        placeholder="İptal açıklaması (zorunlu)"
        disabled={submitting}
        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-red-300 mb-2 disabled:opacity-60"
      />

      {inlineError && (
        <p className="text-xs text-red-600 font-medium mb-3 leading-relaxed">{inlineError}</p>
      )}

      <p className="text-xs text-gray-500 mb-4">
        Her ürün için ayrı iptal fişi yazdırılır. Masaüstü uygulamanın açık olması gerekir.
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={submitting}
          className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {submitting ? 'İptal ediliyor…' : `${items.length} Ürünü İptal Et`}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold disabled:opacity-60"
        >
          Vazgeç
        </button>
      </div>
    </Modal>
  );
}
