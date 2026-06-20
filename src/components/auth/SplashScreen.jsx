import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { useApp } from '../../context/AppContext';
import {
  isPushConfiguredForBranch,
  requestPushOnAppEntry,
} from '../../services/pushNotifications';

const LOGO_SRC = `${import.meta.env.BASE_URL}makara.png`;
const BRAND_PINK = '#ec4899';
const BRAND_PINK_SOFT = '#f472b6';
const SPLASH_MIN_MS = 2000;

export function SplashScreen() {
  const { staff, completeSplash } = useAuth();
  const { theme, branchKey } = useBranch();
  const { bootstrapCatalog } = useApp();
  const [targetProgress, setTargetProgress] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [dataReady, setDataReady] = useState(false);
  const [minTimeDone, setMinTimeDone] = useState(false);
  const loadProgressRef = useRef(0);
  const startedAtRef = useRef(Date.now());

  const accent = theme.accentSolid;
  const accentLight = theme.accentLight || '#fdf2f8';
  const fullName = staff ? `${staff.name || ''} ${staff.surname || ''}`.trim() : '';
  const progressPct = Math.min(100, Math.round(displayProgress));

  const loadingLabel = useMemo(() => {
    if (progressPct < 25) return 'Bağlantı kuruluyor';
    if (progressPct < 55) return 'Menü yükleniyor';
    if (progressPct < 85) return 'Masalar hazırlanıyor';
    if (progressPct < 100) return 'Son dokunuşlar';
    return 'Hazır';
  }, [progressPct]);

  useEffect(() => {
    startedAtRef.current = Date.now();
    setMinTimeDone(false);
    setDataReady(false);
    loadProgressRef.current = 0;
    setTargetProgress(0);
    setDisplayProgress(0);

    const minTimer = window.setTimeout(() => setMinTimeDone(true), SPLASH_MIN_MS);
    return () => clearTimeout(minTimer);
  }, []);

  useEffect(() => {
    if (!staff?.id || !branchKey || !isPushConfiguredForBranch(branchKey)) return undefined;
    if (Notification.permission !== 'default') return undefined;

    let cancelled = false;

    (async () => {
      try {
        if ('serviceWorker' in navigator) {
          await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((resolve) => setTimeout(resolve, 2500)),
          ]);
        }
        if (cancelled || Notification.permission !== 'default') return;
        await requestPushOnAppEntry(branchKey, staff.id);
      } catch {
        /* MainScreen yedek akışı devreye girer */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [staff?.id, branchKey]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await bootstrapCatalog((value) => {
        if (!cancelled) loadProgressRef.current = value;
      });
      if (!cancelled) {
        loadProgressRef.current = 100;
        setDataReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bootstrapCatalog]);

  useEffect(() => {
    let rafId = 0;

    const tick = () => {
      const elapsed = Date.now() - startedAtRef.current;
      const timeProgress = Math.min(100, (elapsed / SPLASH_MIN_MS) * 100);
      const loadProgress = loadProgressRef.current;

      let nextTarget;
      if (!dataReady) {
        nextTarget = Math.min(loadProgress, timeProgress);
      } else if (elapsed < SPLASH_MIN_MS) {
        nextTarget = timeProgress;
      } else {
        nextTarget = 100;
      }

      setTargetProgress(nextTarget);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [dataReady]);

  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      setDisplayProgress((current) => {
        const diff = targetProgress - current;
        if (Math.abs(diff) < 0.15) return targetProgress;
        const step = Math.max(0.12, diff * 0.028);
        return Math.min(targetProgress, current + step);
      });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [targetProgress]);

  useEffect(() => {
    if (!dataReady || !minTimeDone || displayProgress < 99.5) return;
    completeSplash();
  }, [dataReady, minTimeDone, displayProgress, completeSplash]);

  return (
    <div
      className="fixed inset-0 overflow-hidden text-slate-900 animate-splash-fade"
      style={{
        background: `linear-gradient(180deg, ${accentLight} 0%, #ffffff 38%, #f8fafc 100%)`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.45]"
        style={{
          backgroundImage: `radial-gradient(${BRAND_PINK}14 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
        }}
      />
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[58%] w-[min(420px,95vw)] h-[min(420px,95vw)] rounded-full blur-3xl opacity-70 animate-pulse-glow"
        style={{
          background: `radial-gradient(circle, ${BRAND_PINK}28 0%, ${accent}12 42%, transparent 72%)`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-56 opacity-80"
        style={{
          background: `linear-gradient(180deg, ${accent}14 0%, transparent 100%)`,
        }}
      />

      <div className="relative z-10 flex min-h-full flex-col items-center justify-center px-8 pt-[env(safe-area-inset-top,0px)] pb-[max(2.5rem,env(safe-area-inset-bottom,0px))]">
        <div
          className="relative animate-splash-scale"
          style={{ width: 'min(56vw, 240px)', height: 'min(56vw, 240px)' }}
        >
          <div
            className="absolute inset-[-6%] rounded-full opacity-50 animate-pulse-glow"
            style={{
              background: `conic-gradient(from 180deg, transparent, ${BRAND_PINK}30, transparent, ${accent}22, transparent)`,
            }}
          />
          <div className="relative z-[1] flex h-full w-full items-center justify-center rounded-full bg-white p-3 shadow-[0_20px_50px_-24px_rgba(236,72,153,0.35)] ring-1 ring-slate-100">
            <img
              src={LOGO_SRC}
              alt="MAKARA"
              draggable={false}
              className="h-full w-full object-contain"
            />
          </div>
        </div>

        <div
          className="mt-8 flex flex-col items-center text-center animate-splash-reveal"
          style={{ animationDelay: '0.15s' }}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">
            {theme.name}
          </span>
          <p
            className="mt-2 text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: accent }}
          >
            Mobil Personel
          </p>
          <h1 className="mt-5 font-display text-[22px] font-semibold tracking-[-0.03em] text-slate-900">
            {fullName ? `Hoş geldin, ${fullName.split(' ')[0]}` : 'Hoş geldin'}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 font-medium">
            Salon hazırlanıyor…
          </p>
        </div>

        <div
          className="mt-10 w-[min(280px,82vw)] animate-splash-reveal"
          style={{ animationDelay: '0.28s' }}
        >
          <div className="mb-2.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em]">
            <span className="text-slate-400">{loadingLabel}</span>
            <span className="tabular-nums" style={{ color: accent }}>
              {progressPct}%
            </span>
          </div>

          <div
            className="relative h-[3px] overflow-hidden rounded-full"
            style={{ backgroundColor: `${BRAND_PINK}18` }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-150 ease-out"
              style={{
                width: `${progressPct}%`,
                background: `linear-gradient(90deg, ${BRAND_PINK_SOFT} 0%, ${BRAND_PINK} 55%, #db2777 100%)`,
                boxShadow: `0 0 14px ${BRAND_PINK}55`,
              }}
            >
              <div className="absolute inset-0 overflow-hidden rounded-full">
                <div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/45 to-transparent animate-splash-bar-shine" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
