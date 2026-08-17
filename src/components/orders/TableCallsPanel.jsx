import { useEffect, useState } from 'react';
import { useBranch } from '../../context/BranchContext';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import {
  acknowledgeTableCall,
  subscribeActiveTableCalls,
} from '../../services/firebaseService';
import {
  formatTableCallTimestamp,
  isStaffAcknowledged,
  resolveTableForTableCall,
} from '../../utils/tableCalls';
import { hapticLight, hapticSuccess } from '../../utils/haptic';

function TableCallCard({
  tableCall,
  table,
  staffId,
  busyId,
  onAcknowledge,
  onOpenTable,
  accentSolid,
}) {
  const acknowledged = isStaffAcknowledged(tableCall, staffId);
  const ackCount = tableCall.acknowledgedBy?.length || 0;
  const isBusy = busyId === tableCall.id;

  return (
    <article className="rounded-[1.35rem] overflow-hidden bg-white border border-slate-100 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.12)]">
      <button
        type="button"
        onClick={() => onOpenTable(tableCall, table)}
        className="w-full text-left px-4 py-3.5 border-b border-slate-50 bg-slate-50/70 active:bg-slate-100/70 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Garson çağrısı
            </p>
            <p className="font-display font-bold text-lg text-slate-900 mt-0.5">
              {table?.name || tableCall.tableName || `Masa ${tableCall.tableNumber ?? '?'}`}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {formatTableCallTimestamp(tableCall)}
              {tableCall.source === 'qr-menu' && (
                <span className="ml-1.5 text-violet-600 font-semibold">· QR Menü</span>
              )}
            </p>
          </div>
          <span
            className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide"
            style={{ backgroundColor: `${accentSolid}12`, color: accentSolid }}
          >
            Bekliyor
          </span>
        </div>
      </button>

      <div className="px-4 py-3.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          {ackCount > 0 ? (
            <p className="text-xs text-slate-600">
              <span className="font-semibold" style={{ color: accentSolid }}>
                {ackCount} personel
              </span>
              {' '}görüldü / ilgilenildi
            </p>
          ) : (
            <p className="text-xs text-slate-400">Henüz kimse işaretlemedi</p>
          )}
          {ackCount > 0 && (
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              {tableCall.acknowledgedBy.map((entry) => entry.staffName).join(' · ')}
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={isBusy || acknowledged}
          onClick={() => onAcknowledge(tableCall)}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-60 ${
            acknowledged ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-white shadow-md'
          }`}
          style={acknowledged ? undefined : { background: `linear-gradient(145deg, ${accentSolid} 0%, ${accentSolid}cc 100%)` }}
        >
          {acknowledged ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              İşaretli
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {isBusy ? '…' : 'Görüldü'}
            </>
          )}
        </button>
      </div>
    </article>
  );
}

export function TableCallsPanel({ theme }) {
  const { branchKey } = useBranch();
  const { staff } = useAuth();
  const { tables, openTableByNumber, selectTable } = useApp();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!branchKey) return undefined;
    setLoading(true);
    const unsub = subscribeActiveTableCalls(branchKey, (rows) => {
      setCalls(rows);
      setLoading(false);
    });
    return unsub;
  }, [branchKey]);

  const handleAcknowledge = async (tableCall) => {
    if (!staff || busyId) return;
    setBusyId(tableCall.id);
    try {
      await acknowledgeTableCall(tableCall.id, staff);
      hapticSuccess();
    } catch {
      hapticLight();
    } finally {
      setBusyId(null);
    }
  };

  const handleOpenTable = async (tableCall, table) => {
    hapticLight();
    if (table) {
      await selectTable(table);
      return;
    }
    if (tableCall.tableNumber != null) {
      await openTableByNumber(tableCall.tableNumber);
    }
  };

  return (
    <>
      <div className="mb-5 px-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Canlı salon
        </p>
        <h2 className="font-display font-bold text-xl text-slate-900 mt-1 tracking-tight">
          Garson çağrıları
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {calls.length} aktif çağrı
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-9 h-9 border-[3px] border-violet-100 border-t-violet-500 rounded-full animate-spin" />
        </div>
      ) : calls.length === 0 ? (
        <div className="text-center py-16 px-6 rounded-3xl bg-white border border-slate-100 shadow-sm">
          <p className="font-semibold text-slate-700">Aktif garson çağrısı yok</p>
          <p className="text-sm text-slate-400 mt-1">QR menüden gelen çağrılar burada görünür.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {calls.map((tableCall) => {
            const table = resolveTableForTableCall(tableCall, tables);
            return (
              <li key={tableCall.id}>
                <TableCallCard
                  tableCall={tableCall}
                  table={table}
                  staffId={staff?.id}
                  busyId={busyId}
                  onAcknowledge={handleAcknowledge}
                  onOpenTable={handleOpenTable}
                  accentSolid={theme.accentSolid}
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
