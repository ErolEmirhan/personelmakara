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
  // Spotify araması
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null); // null: aranmadı
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [rowBusy, setRowBusy] = useState(null); // `${uri}|play` | `${uri}|queue`
  const searchSeq = useRef(0);
  const inputRef = useRef(null);

  const send = useCallback((mode, extra = {}) => submitAndWaitMobileAction({
    type: 'music_control',
    mode,
    ...extra,
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

  const runSearch = async (e) => {
    e?.preventDefault?.();
    const q = query.trim();
    if (!q || searching) return;
    const id = ++searchSeq.current;
    setSearching(true);
    setSearchError('');
    inputRef.current?.blur();
    try {
      const res = await send('search', { query: q });
      if (id !== searchSeq.current) return;
      if (res.success) setResults(res.result?.results || []);
      else { setResults(null); setSearchError(res.error || 'Arama yapılamadı'); }
    } catch (err) {
      if (id === searchSeq.current) setSearchError(err.message || 'Bağlantı hatası');
    } finally {
      if (id === searchSeq.current) setSearching(false);
    }
  };

  const playTrack = async (t) => {
    if (rowBusy) return;
    setRowBusy(`${t.uri}|play`);
    // Anında göster
    setInfo((prev) => ({ ...(prev || {}), playing: true, title: t.title, artist: t.artist, thumb: t.image, positionSec: 0, durationSec: t.durationSec, receivedAt: Date.now(), noSession: false }));
    try {
      const res = await send('play_track', { uri: t.uri });
      if (res.success) {
        apply(res);
        if (!res.result?.thumb) setInfo((prev) => (prev ? { ...prev, thumb: prev.thumb || t.image } : prev));
        showToast('success', 'Çalıyor', `${t.title} · ${t.artist}`);
      } else {
        showToast('error', 'Çalınamadı', res.error || 'Şarkı çalınamadı');
        refresh();
      }
    } catch (err) {
      showToast('error', 'Çalınamadı', err.message || 'Bağlantı hatası');
    } finally {
      setRowBusy(null);
    }
  };

  const queueTrack = async (t) => {
    if (rowBusy) return;
    setRowBusy(`${t.uri}|queue`);
    try {
      const res = await send('queue_track', { uri: t.uri });
      if (res.success) showToast('success', 'Sıraya eklendi', `${t.title} · ${t.artist}`);
      else showToast('error', 'Eklenemedi', res.error || 'Sıraya eklenemedi');
    } catch (err) {
      showToast('error', 'Eklenemedi', err.message || 'Bağlantı hatası');
    } finally {
      setRowBusy(null);
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
        <span className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => { setSearchOpen((v) => !v); setTimeout(() => inputRef.current?.focus(), 60); }}
          aria-label="Şarkı ara"
          className={`flex h-8 w-8 items-center justify-center rounded-full transition active:scale-90 ${searchOpen ? 'bg-white text-black' : 'bg-white/10 text-white'}`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.4}><circle cx="11" cy="11" r="6.5" /><path strokeLinecap="round" d="M20 20l-4.2-4.2" /></svg>
        </button>
        <span className="flex items-center gap-1 text-[11px] font-bold text-[#1ed760]">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.59 14.42a.62.62 0 01-.86.21c-2.35-1.44-5.31-1.76-8.8-.96a.62.62 0 11-.28-1.22c3.81-.87 7.09-.5 9.73 1.12a.62.62 0 01.21.85zm1.22-2.72a.78.78 0 01-1.07.26c-2.69-1.65-6.79-2.13-9.97-1.17a.78.78 0 11-.45-1.5c3.63-1.1 8.15-.57 11.23 1.33a.78.78 0 01.26 1.08zm.1-2.83C14.68 8.95 9.37 8.78 6.3 9.71a.94.94 0 11-.54-1.8c3.53-1.07 9.39-.86 13.1 1.34a.94.94 0 01-.95 1.62z" /></svg>
          Spotify
        </span>
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

      {searchOpen && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <form onSubmit={runSearch} className="flex w-full min-w-0 items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-white px-3.5 py-2.5 text-black">
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-black/60" fill="none" stroke="currentColor" strokeWidth={2.4}><circle cx="11" cy="11" r="6.5" /><path strokeLinecap="round" d="M20 20l-4.2-4.2" /></svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                enterKeyHint="search"
                placeholder="Şarkı veya sanatçı ara"
                className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold outline-none placeholder:font-medium placeholder:text-black/40"
              />
              {query && (
                <button type="button" onClick={() => { setQuery(''); setResults(null); inputRef.current?.focus(); }} aria-label="Temizle" className="text-black/40">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm3.54 12.12l-1.42 1.42L12 13.41l-2.12 2.13-1.42-1.42L10.59 12 8.46 9.88l1.42-1.42L12 10.59l2.12-2.13 1.42 1.42L13.41 12z" /></svg>
                </button>
              )}
            </div>
            <button type="submit" disabled={!query.trim() || searching} className="shrink-0 rounded-full bg-[#1ed760] px-4 py-2.5 text-sm font-bold text-black disabled:opacity-40">
              Ara
            </button>
          </form>

          <div className="mt-3 max-h-[19rem] space-y-1 overflow-y-auto pr-0.5">
            {searching && Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl p-2">
                <div className="h-11 w-11 shrink-0 animate-pulse rounded-md bg-white/10" />
                <div className="flex-1 space-y-1.5"><div className="h-3 w-2/3 animate-pulse rounded bg-white/10" /><div className="h-2.5 w-1/3 animate-pulse rounded bg-white/10" /></div>
              </div>
            ))}
            {!searching && searchError && <p className="px-1 py-3 text-sm text-[#ff8f8f]">{searchError}</p>}
            {!searching && results && results.length === 0 && <p className="px-1 py-3 text-sm text-white/50">Sonuç bulunamadı</p>}
            {!searching && results && results.map((t) => {
              const busyPlay = rowBusy === `${t.uri}|play`;
              const busyQueue = rowBusy === `${t.uri}|queue`;
              const isCurrent = info?.title === t.title && info?.artist && t.artist.includes(info.artist.split(',')[0]);
              return (
                <div key={t.uri} className={`flex items-center gap-3 rounded-xl p-2 transition ${isCurrent ? 'bg-white/10' : 'active:bg-white/5'}`}>
                  <button type="button" onClick={() => playTrack(t)} disabled={!!rowBusy} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md bg-white/10">
                      {t.image && <img src={t.image} alt="" className="h-full w-full object-cover" loading="lazy" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-[14px] font-semibold ${isCurrent ? 'text-[#1ed760]' : 'text-white'}`}>{t.title}</p>
                      <p className="truncate text-[12px] text-white/55">
                        {t.explicit && <span className="mr-1 rounded-sm bg-white/40 px-1 text-[9px] font-bold text-black">E</span>}
                        {t.artist}
                      </p>
                    </div>
                  </button>
                  <button type="button" onClick={() => queueTrack(t)} disabled={!!rowBusy} aria-label="Sıraya ekle" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/70 transition active:scale-90 active:bg-white/10 disabled:opacity-40">
                    {busyQueue ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" /> : (
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M4 7h11M4 12h11M4 17h7M18 14v6M15 17h6" /></svg>
                    )}
                  </button>
                  <button type="button" onClick={() => playTrack(t)} disabled={!!rowBusy} aria-label="Çal" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1ed760] text-black transition active:scale-90 disabled:opacity-50">
                    {busyPlay ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" /> : <svg viewBox="0 0 24 24" className="h-4 w-4 translate-x-[1px]" fill="currentColor"><path d="M8 5.14v13.72a1 1 0 001.5.86l11.04-6.86a1 1 0 000-1.72L9.5 4.28A1 1 0 008 5.14z" /></svg>}
                  </button>
                </div>
              );
            })}
            {!searching && !results && !searchError && (
              <p className="px-1 py-2 text-xs text-white/40">Şarkıya dokun: hemen kasada çalar · ≡+ ile sıraya ekle</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
