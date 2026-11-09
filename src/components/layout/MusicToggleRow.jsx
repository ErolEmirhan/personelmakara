import { useCallback, useEffect, useRef, useState } from 'react';
import { submitAndWaitMobileAction } from '../../services/firebaseService';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

const fmt = (sec) => {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const Icon = {
  play: (
    <svg viewBox="0 0 24 24" className="w-7 h-7 translate-x-[1px]" fill="currentColor"><path d="M8 5.14v13.72a1 1 0 001.5.86l11.04-6.86a1 1 0 000-1.72L9.5 4.28A1 1 0 008 5.14z" /></svg>
  ),
  pause: (
    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor"><rect x="6" y="4.5" width="4.2" height="15" rx="1.3" /><rect x="13.8" y="4.5" width="4.2" height="15" rx="1.3" /></svg>
  ),
  prev: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><rect x="5" y="5" width="2.4" height="14" rx="1" /><path d="M19 6.2v11.6a.9.9 0 01-1.38.76L9.3 12.76a.9.9 0 010-1.52l8.32-5.8A.9.9 0 0119 6.2z" /></svg>
  ),
  next: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><rect x="16.6" y="5" width="2.4" height="14" rx="1" /><path d="M5 6.2v11.6a.9.9 0 001.38.76l8.32-5.8a.9.9 0 000-1.52L6.38 5.44A.9.9 0 005 6.2z" /></svg>
  ),
  note: (
    <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" /></svg>
  ),
};

/**
 * Müdür: kasadaki müzik (Spotify) — kapak, şarkı, ilerleyen zaman çizgisi, önceki / çal-durdur / sonraki.
 * Menü açılınca kasadan güncel durum alınır; çal/durdur anında değişir (kasa cevabı beklenmez).
 */
export function MusicToggleRow({ open }) {
  const { staff } = useAuth();
  const { showToast } = useApp();
  const [info, setInfo] = useState(null); // { playing, title, artist, positionSec, durationSec, thumb, receivedAt, noSession }
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(null); // 'toggle' | 'next' | 'prev' | null
  const [, setTick] = useState(0);
  const reqRef = useRef(0);
  const endRefreshRef = useRef(false);

  const send = useCallback((mode) => submitAndWaitMobileAction({
    type: 'music_control',
    mode,
    staffId: staff.id,
    staffName: `${staff.name} ${staff.surname}`,
    staffIsManager: !!staff.is_manager,
    staffIsChef: !!staff.is_chef,
    staffIsAdmin: !!staff.is_admin,
    staffIsBoss: !!staff.is_boss,
  }, 20000), [staff]);

  const apply = useCallback((res) => {
    if (!res?.success) return false;
    const r = res.result || {};
    setInfo((prev) => ({
      playing: typeof r.playing === 'boolean' ? r.playing : prev?.playing ?? null,
      title: r.title ?? prev?.title ?? '',
      artist: r.artist ?? prev?.artist ?? '',
      positionSec: Number(r.positionSec) || 0,
      durationSec: Number(r.durationSec) || 0,
      thumb: r.thumb || (r.title && prev?.title === r.title ? prev?.thumb : '') || '',
      receivedAt: Date.now(),
      noSession: false,
    }));
    endRefreshRef.current = false;
    return true;
  }, []);

  const refresh = useCallback(() => {
    if (!staff) return;
    const id = ++reqRef.current;
    setLoading(true);
    send('status')
      .then((res) => {
        if (id !== reqRef.current) return;
        if (!apply(res) && /müzik uygulaması bulunamadı/i.test(res?.error || '')) {
          setInfo({ playing: false, noSession: true, title: '', artist: '', positionSec: 0, durationSec: 0, receivedAt: Date.now() });
        }
      })
      .catch(() => {})
      .finally(() => { if (id === reqRef.current) setLoading(false); });
  }, [staff, send, apply]);

  useEffect(() => { if (open) refresh(); }, [open, refresh]);

  // Zaman çizgisi akarken her yarım saniyede bir çiz; şarkı bitince yeni şarkıyı bir kez sor
  useEffect(() => {
    if (!open || !info?.playing) return undefined;
    const t = setInterval(() => {
      setTick((x) => x + 1);
      const pos = info.positionSec + (Date.now() - info.receivedAt) / 1000;
      if (info.durationSec > 0 && pos >= info.durationSec + 1.5 && !endRefreshRef.current) {
        endRefreshRef.current = true;
        refresh();
      }
    }, 500);
    return () => clearInterval(t);
  }, [open, info, refresh]);

  const position = info
    ? Math.min(info.durationSec || Infinity, info.positionSec + (info.playing ? (Date.now() - info.receivedAt) / 1000 : 0))
    : 0;
  const progress = info?.durationSec > 0 ? Math.min(1, position / info.durationSec) : 0;
  const playing = info?.playing === true;

  const toggle = async () => {
    if (busy) return;
    const next = !playing;
    const snapshot = info;
    reqRef.current += 1;
    setLoading(false);
    // Anında göster: kasa cevabını bekleme
    setInfo((prev) => ({
      ...(prev || { title: '', artist: '', durationSec: 0, thumb: '' }),
      playing: next,
      positionSec: prev ? Math.min(prev.durationSec || Infinity, prev.positionSec + (prev.playing ? (Date.now() - prev.receivedAt) / 1000 : 0)) : 0,
      receivedAt: Date.now(),
    }));
    setBusy('toggle');
    try {
      const res = await send(next ? 'play' : 'pause');
      if (!apply(res)) {
        setInfo(snapshot);
        showToast('error', 'Müzik', res?.error || 'Kasa müziği değiştiremedi');
      }
    } catch (err) {
      setInfo(snapshot);
      showToast('error', 'Müzik', err.message || 'Bağlantı hatası');
    } finally {
      setBusy(null);
    }
  };

  const skip = async (dir) => {
    if (busy) return;
    const snapshot = info;
    reqRef.current += 1;
    setLoading(false);
    // Anında göster: zaman çizgisi başa dönsün, yeni şarkı gelene kadar kapak/ad soluk kalsın
    setInfo((prev) => (prev ? { ...prev, positionSec: 0, receivedAt: Date.now(), playing: true } : prev));
    setBusy(dir);
    try {
      const res = await send(dir);
      if (!apply(res)) {
        setInfo(snapshot);
        showToast('error', 'Müzik', res?.error || 'Şarkı değiştirilemedi');
      }
    } catch (err) {
      setInfo(snapshot);
      showToast('error', 'Müzik', err.message || 'Bağlantı hatası');
    } finally {
      setBusy(null);
    }
  };

  const title = info?.noSession ? 'Spotify açık değil' : info?.title || (loading ? 'Kasaya bağlanıyor…' : 'Kasadaki müzik');
  const artist = info?.noSession ? 'Kasada Spotify\'ı açın' : info?.artist || (loading && !info ? '' : playing ? '' : 'Müzik kapalı');

  return (
    <div
      className="relative overflow-hidden rounded-[1.6rem] p-4 text-white shadow-[0_18px_40px_-18px_rgba(0,0,0,0.6)]"
      style={{ background: 'radial-gradient(120% 140% at 0% 0%, #2a4a37 0%, #17241c 38%, #101010 75%)' }}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
          <span className={`h-1.5 w-1.5 rounded-full ${playing ? 'bg-[#1ed760] animate-pulse' : 'bg-white/30'}`} />
          {playing ? 'Kasada çalıyor' : 'Kasa müziği'}
        </span>
        <span className="flex items-center gap-1 text-[11px] font-bold text-[#1ed760]">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.59 14.42a.62.62 0 01-.86.21c-2.35-1.44-5.31-1.76-8.8-.96a.62.62 0 11-.28-1.22c3.81-.87 7.09-.5 9.73 1.12a.62.62 0 01.21.85zm1.22-2.72a.78.78 0 01-1.07.26c-2.69-1.65-6.79-2.13-9.97-1.17a.78.78 0 11-.45-1.5c3.63-1.1 8.15-.57 11.23 1.33a.78.78 0 01.26 1.08zm.1-2.83C14.68 8.95 9.37 8.78 6.3 9.71a.94.94 0 11-.54-1.8c3.53-1.07 9.39-.86 13.1 1.34a.94.94 0 01-.95 1.62z" /></svg>
          Spotify
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3.5">
        <div className={`relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-xl bg-white/10 shadow-[0_10px_24px_-8px_rgba(0,0,0,0.7)] transition-opacity ${busy === 'next' || busy === 'prev' ? 'opacity-40' : ''}`}>
          {info?.thumb ? (
            <img src={info.thumb} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/40">{Icon.note}</div>
          )}
          {loading && !info && <div className="absolute inset-0 animate-pulse bg-white/10" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-[17px] font-bold leading-tight ${busy === 'next' || busy === 'prev' ? 'opacity-50' : ''}`}>{title}</p>
          <p className="mt-0.5 truncate text-[13px] text-white/60">{artist || ' '}</p>
        </div>
      </div>

      <div className="mt-3.5">
        <div className="relative h-1 rounded-full bg-white/20">
          <div className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${progress * 100}%` }} />
          <div
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
            style={{ left: `${progress * 100}%`, opacity: info?.durationSec ? 1 : 0 }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] font-medium tabular-nums text-white/50">
          <span>{fmt(position)}</span>
          <span>{info?.durationSec ? fmt(info.durationSec) : '–:––'}</span>
        </div>
      </div>

      <div className="mt-1 flex items-center justify-center gap-6">
        <button type="button" onClick={() => skip('prev')} disabled={!!busy || info?.noSession} aria-label="Önceki şarkı" className="flex h-11 w-11 items-center justify-center rounded-full text-white/85 transition active:scale-90 active:bg-white/10 disabled:opacity-40">
          {Icon.prev}
        </button>
        <button
          type="button"
          onClick={toggle}
          disabled={busy === 'next' || busy === 'prev' || info?.noSession}
          aria-label={playing ? 'Müziği durdur' : 'Müziği çal'}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#1ed760] text-black shadow-[0_10px_24px_-8px_rgba(30,215,96,0.7)] transition active:scale-95 disabled:opacity-50"
        >
          {playing ? Icon.pause : Icon.play}
          {busy === 'toggle' && <span className="absolute -inset-1 rounded-full border-2 border-[#1ed760]/30 border-t-[#1ed760] animate-spin" />}
        </button>
        <button type="button" onClick={() => skip('next')} disabled={!!busy || info?.noSession} aria-label="Sonraki şarkı" className="flex h-11 w-11 items-center justify-center rounded-full text-white/85 transition active:scale-90 active:bg-white/10 disabled:opacity-40">
          {Icon.next}
        </button>
      </div>
    </div>
  );
}
