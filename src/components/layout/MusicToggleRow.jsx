import { useCallback, useEffect, useRef, useState } from 'react';
import { submitAndWaitMobileAction } from '../../services/firebaseService';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

/**
 * Müdür: kasadaki müziği (Spotify) açar / kapatır. Kasa, Windows medya kontrolüyle doğrudan
 * çal / durdur der; "Kapalı" zaten durmuş müziği açmaz. Menü açılınca kasadan güncel durum alınır.
 */
export function MusicToggleRow({ open }) {
  const { staff } = useAuth();
  const { showToast } = useApp();
  const [playing, setPlaying] = useState(null); // true | false | null (bilinmiyor)
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const reqRef = useRef(0);

  const send = useCallback(async (mode) => {
    const res = await submitAndWaitMobileAction({
      type: 'music_control',
      mode,
      staffId: staff.id,
      staffName: `${staff.name} ${staff.surname}`,
      staffIsManager: !!staff.is_manager,
      staffIsChef: !!staff.is_chef,
      staffIsAdmin: !!staff.is_admin,
      staffIsBoss: !!staff.is_boss,
    }, 20000);
    return res;
  }, [staff]);

  useEffect(() => {
    if (!open || !staff) return;
    const id = ++reqRef.current;
    setChecking(true);
    send('status')
      .then((res) => {
        if (id !== reqRef.current) return;
        if (res.success) {
          setPlaying(typeof res.result?.playing === 'boolean' ? res.result.playing : null);
          setTitle(res.result?.title || '');
        }
      })
      .catch(() => {})
      .finally(() => { if (id === reqRef.current) setChecking(false); });
  }, [open, staff, send]);

  const toggle = async () => {
    if (busy) return;
    const next = !(playing === true);
    setBusy(true);
    reqRef.current += 1;
    setChecking(false);
    try {
      const res = await send(next ? 'play' : 'pause');
      if (res.success) {
        const now = typeof res.result?.playing === 'boolean' ? res.result.playing : next;
        setPlaying(now);
        setTitle(res.result?.title || '');
        showToast('success', now ? 'Müzik açıldı' : 'Müzik durduruldu', res.result?.title || 'Kasadaki müzik');
      } else {
        showToast('error', 'Müzik', res.error || 'Kasa müziği değiştiremedi');
      }
    } catch (err) {
      showToast('error', 'Müzik', err.message || 'Bağlantı hatası');
    } finally {
      setBusy(false);
    }
  };

  const on = playing === true;
  const status = busy
    ? (on ? 'Durduruluyor…' : 'Açılıyor…')
    : checking && playing === null
      ? 'Kasadan durum alınıyor…'
      : playing === null
        ? 'Kasadaki müziği aç / kapat'
        : on
          ? (title ? `Çalıyor · ${title}` : 'Kasada müzik çalıyor')
          : 'Kasada müzik kapalı';

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className="w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all bg-white border-slate-100 shadow-[0_4px_20px_-12px_rgba(15,23,42,0.12)] active:scale-[0.99] disabled:opacity-70"
      aria-pressed={on}
    >
      <div
        className="relative shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: on ? '#dcfce7' : '#f1f5f9', color: on ? '#16a34a' : '#64748b' }}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
        </svg>
        {on && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 ring-2 ring-white animate-pulse" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[15px] text-slate-900">Müzik</p>
        <p className="text-xs mt-0.5 leading-relaxed text-slate-500 truncate">{status}</p>
      </div>
      <span
        className={`shrink-0 relative inline-flex items-center h-8 w-[5rem] rounded-full transition-colors ${on ? 'bg-green-500' : 'bg-slate-300'}`}
      >
        <span className={`absolute text-[10px] font-extrabold text-white ${on ? 'left-2.5' : 'right-2'}`}>{on ? 'AÇIK' : 'KAPALI'}</span>
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? 'left-[calc(100%-1.75rem)]' : 'left-1'}`}
        >
          {busy && <span className="absolute inset-1 rounded-full border-2 border-slate-200 border-t-slate-500 animate-spin" />}
        </span>
      </span>
    </button>
  );
}
