import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { submitAndWaitMobileAction } from '../../services/firebaseService';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

async function cancelOrderItems({
  item,
  tableId,
  staff,
  cancelQty,
  reason,
  onProgress,
}) {
  const base = {
    type: 'cancel_item',
    itemId: item.id,
    cancelReason: reason,
    tableId,
    staffId: staff.id,
    staffName: `${staff.name} ${staff.surname}`,
  };

  const maxQty = item.quantity || 1;

  if (cancelQty >= maxQty) {
    return submitAndWaitMobileAction({
      ...base,
      cancelQuantity: maxQty,
    });
  }

  let lastResult = null;
  for (let i = 0; i < cancelQty; i += 1) {
    onProgress?.(i + 1, cancelQty);
    lastResult = await submitAndWaitMobileAction({
      ...base,
      cancelQuantity: 1,
    });
    if (!lastResult.success) {
      return {
        ...lastResult,
        partialCount: i,
      };
    }
  }
  return lastResult;
}

export function CancelItemModal({ open, item, tableId, onClose }) {
  const { staff } = useAuth();
  const { showToast } = useApp();
  const [reason, setReason] = useState('');
  const [cancelQty, setCancelQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [inlineError, setInlineError] = useState('');

  const maxQty = item?.quantity || 1;

  useEffect(() => {
    if (open && item) {
      setCancelQty(item.quantity);
      setReason('');
      setInlineError('');
      setProgress(null);
    }
  }, [open, item?.id, item?.quantity]);

  const handleCancel = async () => {
    if (!item || !tableId || !staff) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      setInlineError('İptal açıklaması zorunludur');
      showToast('error', 'Gerekli', 'İptal açıklaması zorunludur');
      return;
    }
    if (cancelQty < 1 || cancelQty > maxQty) {
      setInlineError('Geçersiz adet');
      return;
    }

    setInlineError('');
    setLoading(true);
    setProgress(null);

    try {
      const res = await cancelOrderItems({
        item,
        tableId,
        staff,
        cancelQty,
        reason: trimmed,
        onProgress: (current, total) => {
          if (total > 1) setProgress({ current, total });
        },
      });

      if (res.success) {
        const label = cancelQty === maxQty
          ? 'Ürün iptal edildi'
          : `${cancelQty} adet iptal edildi`;
        showToast('success', 'İptal', label);
        setReason('');
        onClose();
        return;
      }

      if (res.partialCount > 0) {
        const msg = `${res.partialCount} adet iptal edildi; devam edilemedi: ${res.error || 'Bilinmeyen hata'}`;
        setInlineError(msg);
        showToast('error', 'Kısmi iptal', msg);
        onClose();
        return;
      }

      if (res.requiresReason) {
        setInlineError(res.error || 'İptal açıklaması girin');
        showToast('error', 'Gerekli', res.error || 'İptal açıklaması girin');
      } else {
        setInlineError(res.error || 'İptal edilemedi');
        showToast('error', 'Hata', res.error || 'İptal edilemedi');
      }
    } catch (err) {
      const msg = err.message || 'Bağlantı hatası';
      setInlineError(msg);
      showToast('error', 'Hata', msg);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  if (!item) return null;

  const partial = maxQty > 1;

  return (
    <Modal open={open} onClose={onClose} title="Ürün İptal">
      <p className="text-gray-600 mt-1 mb-4">
        <strong>{item.product_name}</strong>
        {partial
          ? ` — masada ${maxQty} adet var`
          : ` — ${maxQty} adet iptal edilecek`}
      </p>

      {partial && (
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
            İptal adedi
          </p>
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
            <button
              type="button"
              onClick={() => setCancelQty((q) => Math.max(1, q - 1))}
              disabled={loading || cancelQty <= 1}
              className="w-10 h-10 rounded-xl bg-white border border-gray-200 font-bold text-lg disabled:opacity-40 active:bg-gray-100"
              aria-label="Azalt"
            >
              −
            </button>
            <div className="text-center min-w-[5rem]">
              <span className="text-2xl font-black text-gray-900">{cancelQty}</span>
              <span className="text-xs text-gray-500 block mt-0.5">/ {maxQty} adet</span>
            </div>
            <button
              type="button"
              onClick={() => setCancelQty((q) => Math.min(maxQty, q + 1))}
              disabled={loading || cancelQty >= maxQty}
              className="w-10 h-10 rounded-xl bg-white border border-gray-200 font-bold text-lg disabled:opacity-40 active:bg-gray-100"
              aria-label="Artır"
            >
              +
            </button>
          </div>
        </div>
      )}

      <input
        type="text"
        value={reason}
        onChange={(e) => {
          setReason(e.target.value);
          if (inlineError) setInlineError('');
        }}
        placeholder="İptal açıklaması (zorunlu)"
        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-red-300 mb-2"
      />

      {inlineError && (
        <p className="text-xs text-red-600 font-medium mb-3 leading-relaxed">{inlineError}</p>
      )}

      <p className="text-xs text-gray-500 mb-4">
        İptal fişi yazdırılır. Masaüstü uygulamanın açık olması gerekir.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleCancel}
          disabled={loading}
          className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold disabled:opacity-50"
        >
          {loading
            ? (progress
              ? `${progress.current}/${progress.total} iptal…`
              : 'İşleniyor...')
            : partial
              ? `${cancelQty} Adet İptal Et`
              : 'İptal Et'}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold"
        >
          Vazgeç
        </button>
      </div>
    </Modal>
  );
}
