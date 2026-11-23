import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { submitAndWaitMobileAction } from '../../services/firebaseService';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

const money = (x) =>
  (Number(x) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';

const tableLabel = (table) => (table ? table.name || `Masa ${table.number}` : '');

/**
 * Müdür: masa kartındaki üç noktadan açılan işlem menüsü.
 * "Masayı sonlandır" → onay → kasa masayı kapatır ve satışı kaydeder (ödeme türü kasada otomatik).
 */
export function TableCloseSheet({ table, onClose }) {
  const { showToast } = useApp();
  const { staff } = useAuth();
  const [step, setStep] = useState('menu'); // menu | confirm
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (table) {
      setStep('menu');
      setLoading(false);
    }
  }, [table]);

  if (!table) return null;

  const total = typeof table.orderTotal === 'number' ? table.orderTotal : 0;
  const close = () => {
    if (!loading) onClose();
  };

  const confirmClose = async () => {
    if (!staff || loading) return;
    setLoading(true);
    try {
      const res = await submitAndWaitMobileAction({
        type: 'close_table',
        tableId: String(table.id),
        staffId: staff.id,
        staffName: `${staff.name} ${staff.surname}`,
        staffIsManager: !!staff.is_manager,
        staffIsChef: !!staff.is_chef,
        staffIsAdmin: !!staff.is_admin,
        staffIsBoss: !!staff.is_boss,
      });
      if (res.success) {
        const r = res.result || {};
        const amount = typeof r.totalAmount === 'number' ? r.totalAmount : total;
        showToast(
          'success',
          'Masa sonlandırıldı',
          `${r.tableName || tableLabel(table)} · ${money(amount)}${r.paymentMethod ? ` · ${r.paymentMethod}` : ''} satış olarak kaydedildi`
        );
        onClose();
      } else {
        showToast('error', 'Sonlandırılamadı', res.error || 'Kasa masayı kapatamadı');
        setLoading(false);
      }
    } catch (err) {
      showToast('error', 'Hata', err.message || 'Bağlantı hatası');
      setLoading(false);
    }
  };

  // Sayfa kökünde açılır: kaydırılan / animasyonlu kapsayıcının içinde kalıp ekran dışına düşmesin
  return createPortal(
    <div
      className="fixed inset-0 z-[9000] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm animate-fade-in"
      onClick={close}
    >
      <div
        className="w-full sm:max-w-sm bg-white rounded-t-[1.75rem] sm:rounded-3xl shadow-2xl animate-slide-up overflow-hidden sm:mx-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${tableLabel(table)} işlemleri`}
      >
        <div className="flex justify-center pt-2.5 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-gray-200" />
        </div>

        {/* Masa özeti */}
        <div className="px-5 pt-4 pb-4 flex items-center gap-3.5">
          <span className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-950 text-emerald-50 flex flex-col items-center justify-center shadow-lg shadow-emerald-900/25">
            <span className="text-xl font-black leading-none">{table.number}</span>
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">Açık masa</p>
            <p className="text-lg font-bold font-display tracking-tight text-gray-900 truncate">{tableLabel(table)}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[11px] font-semibold text-gray-400">Toplam</p>
            <p className="text-lg font-black tabular-nums text-gray-900">{money(total)}</p>
          </div>
        </div>

        {step === 'menu' ? (
          <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={() => setStep('confirm')}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-rose-50 ring-1 ring-rose-100 text-left active:scale-[0.99] transition-all"
            >
              <span className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-md shadow-rose-500/25">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-[15px] text-rose-700">Masayı sonlandır</span>
                <span className="block text-xs text-rose-600/70 mt-0.5">Satışı tamamla ve masayı boşalt</span>
              </span>
              <svg className="shrink-0 w-5 h-5 text-rose-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={close}
              className="w-full mt-2.5 py-3.5 rounded-2xl bg-gray-100 text-gray-700 font-bold text-[15px] active:scale-[0.99] transition-all"
            >
              Vazgeç
            </button>
          </div>
        ) : (
          <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="rounded-2xl bg-gray-50 ring-1 ring-gray-100 px-4 py-4 text-center">
              <p className="text-sm font-semibold text-gray-500">Satış olarak kaydedilecek tutar</p>
              <p className="mt-1 text-4xl font-black tracking-tight tabular-nums text-gray-900">{money(total)}</p>
              <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                Masa kapanır ve tutar ciroya işlenir. Ödeme türü kasada otomatik işaretlenir.
                <br />Bu işlem geri alınamaz.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 mt-3">
              <button
                type="button"
                onClick={() => setStep('menu')}
                disabled={loading}
                className="py-3.5 rounded-2xl bg-gray-100 text-gray-700 font-bold text-[15px] active:scale-[0.99] transition-all disabled:opacity-40"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={confirmClose}
                disabled={loading}
                className="py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold text-[15px] shadow-lg shadow-rose-500/25 active:scale-[0.99] transition-all disabled:opacity-70"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Kapatılıyor…
                  </span>
                ) : (
                  'Sonlandır'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
