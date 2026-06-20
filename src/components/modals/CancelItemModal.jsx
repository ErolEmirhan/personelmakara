import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { submitAndWaitMobileAction } from '../../services/firebaseService';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

export function CancelItemModal({ open, item, tableId, onClose }) {
  const { staff } = useAuth();
  const { showToast } = useApp();
  const [reason, setReason] = useState('');
  const [cancelQty, setCancelQty] = useState(1);
  const [loading, setLoading] = useState(false);

  const maxQty = item?.quantity || 1;

  useEffect(() => {
    if (open && item) {
      setCancelQty(item.quantity);
      setReason('');
    }
  }, [open, item?.id, item?.quantity]);

  const handleCancel = async () => {
    if (!item || !tableId || !staff) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      showToast('error', 'Gerekli', 'İptal açıklaması zorunludur');
      return;
    }
    if (cancelQty < 1 || cancelQty > maxQty) {
      showToast('error', 'Hata', 'Geçersiz adet');
      return;
    }
    setLoading(true);
    try {
      const res = await submitAndWaitMobileAction({
        type: 'cancel_item',
        itemId: item.id,
        cancelQuantity: cancelQty,
        cancelReason: trimmed,
        tableId,
        staffId: staff.id,
        staffName: `${staff.name} ${staff.surname}`,
      });
      if (res.success) {
        const label = cancelQty === maxQty
          ? 'Ürün iptal edildi'
          : `${cancelQty} adet iptal edildi`;
        showToast('success', 'İptal', label);
        setReason('');
        onClose();
      } else if (res.requiresReason) {
        showToast('error', 'Gerekli', res.error || 'İptal açıklaması girin');
      } else {
        showToast('error', 'Hata', res.error || 'İptal edilemedi');
      }
    } catch (err) {
      showToast('error', 'Hata', err.message || 'Bağlantı hatası');
    } finally {
      setLoading(false);
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
        onChange={(e) => setReason(e.target.value)}
        placeholder="İptal açıklaması (zorunlu)"
        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-red-300 mb-4"
      />
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
          {loading ? 'İşleniyor...' : partial ? `${cancelQty} Adet İptal Et` : 'İptal Et'}
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
