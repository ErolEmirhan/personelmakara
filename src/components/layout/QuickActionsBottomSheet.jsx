import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { useApp } from '../../context/AppContext';
import { canMergeTable } from '../../config/branch';
import { BottomSheet } from '../ui/BottomSheet';
import { TransferTableModal } from '../modals/TransferTableModal';
import { MergeTableModal } from '../modals/MergeTableModal';
import { useBackHandler } from '../../hooks/useBackButton';

function ActionRow({ icon, iconStyle, title, description, onClick, disabled, loading, locked }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all ${
        locked
          ? 'bg-slate-50/90 border-slate-200/80 cursor-default active:scale-100'
          : 'bg-white border-slate-100 shadow-[0_4px_20px_-12px_rgba(15,23,42,0.12)] active:scale-[0.99] disabled:opacity-55'
      }`}
    >
      <div
        className={`relative shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${
          locked ? 'opacity-45 grayscale' : ''
        }`}
        style={iconStyle}
      >
        {icon}
        {locked && (
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-600 text-white flex items-center justify-center ring-2 ring-white shadow-sm">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-[15px] ${locked ? 'text-slate-400' : 'text-slate-900'}`}>
          {title}
        </p>
        <p className={`text-xs mt-0.5 leading-relaxed ${locked ? 'text-slate-400' : 'text-slate-500'}`}>
          {description}
        </p>
      </div>
      {loading ? (
        <div className="shrink-0 w-5 h-5 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
      ) : locked ? (
        <svg className="shrink-0 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      ) : (
        <svg className="shrink-0 w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  );
}

export function QuickActionsBottomSheet({ open, onClose }) {
  const { staff, refreshStaffProfile } = useAuth();
  const { theme, branchKey } = useBranch();
  const { loadData, showToast } = useApp();
  const [showTransfer, setShowTransfer] = useState(false);
  const [showMerge, setShowMerge] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const accent = theme.accentSolid;
  const canMerge = canMergeTable(staff, branchKey);

  useBackHandler(showTransfer, () => setShowTransfer(false));
  useBackHandler(showMerge, () => setShowMerge(false));

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshStaffProfile();
      await loadData({ force: true });
      showToast('success', 'Başarılı', 'Tüm veriler yenilendi');
      onClose();
    } catch {
      showToast('error', 'Hata', 'Veriler yenilenemedi');
    } finally {
      setRefreshing(false);
    }
  };

  const openTransfer = () => {
    onClose();
    setShowTransfer(true);
  };

  const openMerge = () => {
    if (!canMerge) {
      showToast('error', 'Yetki gerekli', 'Masa birleştirmek için müdür yetkisi gerekir');
      return;
    }
    onClose();
    setShowMerge(true);
  };

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title="Hızlı işlemler"
        subtitle="Masa operasyonları ve veri yenileme"
      >
        <div className="px-5 py-5 pb-8 space-y-3">
          <ActionRow
            title="Masa aktar"
            description="Dolu masayı boş bir masaya taşıyın"
            iconStyle={{ backgroundColor: `${accent}14`, color: accent }}
            icon={(
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            )}
            onClick={openTransfer}
          />

          <ActionRow
            title="Masa birleştir"
            description={
              canMerge
                ? 'İki masanın siparişlerini tek masada toplayın'
                : 'Müdür yetkisi gerekir'
            }
            locked={!canMerge}
            iconStyle={{
              backgroundColor: canMerge ? '#f3e8ff' : '#f1f5f9',
              color: canMerge ? '#7c3aed' : '#94a3b8',
            }}
            icon={(
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
            )}
            onClick={openMerge}
          />

          <ActionRow
            title="Verileri yenile"
            description="Menü, masalar ve profil bilgilerini güncelle"
            loading={refreshing}
            iconStyle={{ backgroundColor: '#ecfdf5', color: '#059669' }}
            icon={(
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            )}
            onClick={handleRefresh}
            disabled={refreshing}
          />
        </div>
      </BottomSheet>

      <TransferTableModal open={showTransfer} onClose={() => setShowTransfer(false)} />
      <MergeTableModal open={showMerge} onClose={() => setShowMerge(false)} />
    </>
  );
}
