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
}) {
  const base = {
    type: 'cancel_item',
    itemId: item.id,
    cancelReason: reason,
    tableId,
    staffId: staff.id,
    staffName: `${staff.name} ${staff.surname}`,
    staffIsManager: !!staff.is_manager,
    staffIsChef: !!staff.is_chef,
    staffIsAdmin: !!staff.is_admin,
    staffIsBoss: !!staff.is_boss,
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
  const { showToast, optimisticallyCancelOrderItem, loadExistingOrders } = useApp();
  const [reason, setReason] = useState('');
  const [cancelQty, setCancelQty] = useState(1);
  const [inlineError, setInlineError] = useState('');

  const maxQty = item?.quantity || 1;

  useEffect(() => {
    if (open && item) {
      setCancelQty(item.quantity);
      setReason('');
      setInlineError('');
    }
  }, [open, item?.id, item?.quantity]);

  const handleCancel = () => {
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

    const itemSnapshot = { ...item };
    const qty = cancelQty;

    optimisticallyCancelOrderItem(item.id, qty);
    setReason('');
    onClose();

    const label = qty === maxQty ? 'Ürün iptal edildi' : `${qty} adet iptal edildi`;
    showToast('success', 'İptal', label);

    void (async () => {
      try {
        const res = await cancelOrderItems({
          item: itemSnapshot,
          tableId,
          staff,
          cancelQty: qty,
          reason: trimmed,
        });

        if (res.success) return;

        if (res.partialCount > 0) {
          showToast(
            'error',
            'Kısmi iptal',
            `${res.partialCount} adet iptal edildi; devam edilemedi: ${res.error || 'Bilinmeyen hata'}`
          );
        } else {
          showToast('error', 'İptal başarısız', res.error || 'Kasa işlemi tamamlanamadı');
        }
        loadExistingOrders(tableId);
      } catch (err) {
        showToast('error', 'İptal başarısız', err.message || 'Bağlantı hatası');
        loadExistingOrders(tableId);
      }
    })();
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
              disabled={cancelQty <= 1}
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
              disabled={cancelQty >= maxQty}
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
          className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold active:scale-[0.98] transition-transform"
        >
          {partial ? `${cancelQty} Adet İptal Et` : 'İptal Et'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold"
        >
          Vazgeç
        </button>
      </div>
    </Modal>
  );
}
