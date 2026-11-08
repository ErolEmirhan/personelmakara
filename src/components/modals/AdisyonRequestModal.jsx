import { useEffect, useMemo, useState } from 'react';
import { submitAndWaitMobileAction } from '../../services/firebaseService';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { TablePickerGrid } from '../tables/TablePickerGrid';
import { TableOpsModalShell, TableSummaryCard } from './TableOpsModalShell';

/** Müdür: seçilen masanın adisyonunu ya da gün sonu adisyonlarının hepsini kasa yazıcısından ister */
export function AdisyonRequestModal({ open, onClose }) {
  const { tables, showToast } = useApp();
  const { staff } = useAuth();
  const [tableId, setTableId] = useState('');
  const [loading, setLoading] = useState(null); // 'one' | 'all' | null

  useEffect(() => {
    if (!open) {
      setTableId('');
      setLoading(null);
    }
  }, [open]);

  const occupiedCount = useMemo(() => tables.filter((t) => t.hasOrder).length, [tables]);
  const table = useMemo(() => tables.find((t) => String(t.id) === String(tableId)), [tables, tableId]);

  const staffFields = () => ({
    staffId: staff.id,
    staffName: `${staff.name} ${staff.surname}`,
    staffIsManager: !!staff.is_manager,
    staffIsChef: !!staff.is_chef,
    staffIsAdmin: !!staff.is_admin,
    staffIsBoss: !!staff.is_boss,
  });

  const requestOne = async () => {
    if (!table || !staff || loading) return;
    setLoading('one');
    try {
      const res = await submitAndWaitMobileAction({ type: 'print_adisyon', tableId: String(table.id), ...staffFields() });
      if (res.success) {
        showToast('success', 'Adisyon yazdırıldı', `${table.name || `Masa ${table.number}`} adisyonu kasa yazıcısından çıktı`);
        onClose();
      } else {
        showToast('error', 'Yazdırılamadı', res.error || 'Kasa adisyonu yazdıramadı');
      }
    } catch (err) {
      showToast('error', 'Hata', err.message || 'Bağlantı hatası');
    } finally {
      setLoading(null);
    }
  };

  const requestAll = async () => {
    if (!staff || loading) return;
    setLoading('all');
    try {
      const res = await submitAndWaitMobileAction({ type: 'print_all_adisyons', ...staffFields() });
      if (res.success) {
        const count = res.result?.count;
        showToast('success', 'Gün sonu başladı', `${count ? `${count} masanın adisyonu` : 'Adisyonlar'} kasa yazıcısından art arda çıkıyor`);
        onClose();
      } else {
        showToast('error', 'Başlatılamadı', res.error || 'Kasa gün sonu adisyonlarını başlatamadı');
      }
    } catch (err) {
      showToast('error', 'Hata', err.message || 'Bağlantı hatası');
    } finally {
      setLoading(null);
    }
  };

  return (
    <TableOpsModalShell
      open={open}
      onClose={onClose}
      title="Adisyon İste"
      subtitle="Kasa yazıcısından fiyatlı adisyon"
      icon="🧾"
      accent="from-amber-500 via-orange-500 to-rose-500"
      footer={
        <button
          type="button"
          onClick={requestOne}
          disabled={!table || !!loading}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-[15px] shadow-lg shadow-orange-500/25 disabled:opacity-40 disabled:shadow-none active:scale-[0.98] transition-all"
        >
          {loading === 'one' ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Yazdırılıyor...
            </span>
          ) : table ? (
            `${table.name || `Masa ${table.number}`} adisyonunu yazdır`
          ) : (
            'Masa seçin'
          )}
        </button>
      }
    >
      <button
        type="button"
        onClick={requestAll}
        disabled={!!loading || occupiedCount === 0}
        className="w-full mb-5 flex items-center gap-4 p-4 rounded-2xl text-left bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-lg shadow-slate-900/20 active:scale-[0.99] transition-all disabled:opacity-50"
      >
        <span className="shrink-0 w-12 h-12 rounded-2xl bg-amber-400/15 text-amber-300 flex items-center justify-center">
          {loading === 'all' ? (
            <span className="w-5 h-5 border-2 border-amber-200/30 border-t-amber-300 rounded-full animate-spin" />
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
            </svg>
          )}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-bold text-[15px]">Gün sonu adisyonları iste</span>
          <span className="block text-xs text-white/60 mt-0.5 leading-relaxed">
            {occupiedCount > 0
              ? `Açık ${occupiedCount} masanın adisyonu kasa yazıcısından art arda çıkar`
              : 'Açık masa yok'}
          </span>
        </span>
        <svg className="shrink-0 w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {table && (
        <div className="mb-4">
          <TableSummaryCard table={table} />
        </div>
      )}

      <p className="text-sm text-gray-500 mb-3 leading-relaxed">
        Ya da adisyonunu istediğiniz masayı seçin:
      </p>
      <TablePickerGrid
        tables={tables}
        selectedId={tableId}
        onSelect={(t) => setTableId(t.id)}
        filterMode="occupied"
        emptyMessage="Açık masa yok"
      />
    </TableOpsModalShell>
  );
}
