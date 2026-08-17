import { useState } from 'react';
import { enableTableCallSoundWithTest } from '../../utils/tableCallSound';

export function TableCallSoundPrompt({ staffId, open, onEnabled, onDismiss }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!open || !staffId) return null;

  const handleEnable = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await enableTableCallSoundWithTest(staffId);
      if (result.ok) {
        onEnabled?.();
      } else {
        setError('Ses açılamadı. Tekrar deneyin.');
      }
    } catch {
      setError('Ses açılamadı. Telefonun sessiz modda olmadığından emin olun.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-end justify-center p-4 pb-24 bg-black/45 backdrop-blur-[1px]">
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-violet-100"
        role="dialog"
        aria-labelledby="table-call-sound-title"
      >
        <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center mb-3">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8.5 8.5 0 010 12.002M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396.234-.847 1.058-1.354 1.938-1.354h2.24z" />
          </svg>
        </div>
        <h3 id="table-call-sound-title" className="text-base font-bold text-slate-900">
          Garson çağrısı sesi
        </h3>
        <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
          Telefon garson çağrılarını duyabilmeniz için bir kez onay gerekir. Butona basınca kısa bir test sesi çalar.
        </p>
        {error && (
          <p className="mt-2 text-xs font-medium text-red-600">{error}</p>
        )}
        <div className="flex flex-col gap-2 mt-4">
          <button
            type="button"
            onClick={handleEnable}
            disabled={busy}
            className="w-full py-3 rounded-xl bg-violet-600 text-white text-sm font-bold disabled:opacity-50 active:scale-[0.99] transition-transform"
          >
            {busy ? 'Açılıyor…' : 'Sesi aç ve dene'}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            disabled={busy}
            className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold active:scale-[0.99] transition-transform"
          >
            Şimdilik değil
          </button>
        </div>
      </div>
    </div>
  );
}
