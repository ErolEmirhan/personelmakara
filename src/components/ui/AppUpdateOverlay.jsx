import { useEffect, useMemo, useRef, useState } from 'react';
import { useBranch } from '../../context/BranchContext';

const LOGO_SRC = `${import.meta.env.BASE_URL}makara.png`;
const UPDATE_DURATION_MS = 2400;

function readAccent() {
  if (typeof document === 'undefined') return '#7c3aed';
  return (
    getComputedStyle(document.documentElement).getPropertyValue('--accent-solid').trim()
    || '#7c3aed'
  );
}

function UpdateOrbs({ accent }) {
  return (
    <>
      <div
        className="pointer-events-none absolute -top-[18%] -left-[12%] w-[72%] h-[72%] rounded-full blur-3xl animate-luxury-float-a opacity-70"
        style={{ background: `radial-gradient(circle, ${accent}40 0%, transparent 68%)` }}
      />
      <div
        className="pointer-events-none absolute top-[38%] -right-[8%] w-[58%] h-[58%] rounded-full blur-3xl animate-luxury-float-b opacity-60"
        style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.35) 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute bottom-[-8%] left-[18%] w-[52%] h-[52%] rounded-full blur-3xl animate-luxury-float-c opacity-50"
        style={{ background: `radial-gradient(circle, ${accent}28 0%, transparent 72%)` }}
      />
    </>
  );
}

export function AppUpdateOverlay({ isReloadPending = true }) {
  const { theme } = useBranch();
  const accent = theme?.accentSolid || readAccent();
  const accentLight = theme?.accentLight || '#f5f3ff';
  const branchName = theme?.name || 'MAKARA';

  const [progress, setProgress] = useState(0);
  const startedAtRef = useRef(Date.now());
  const progressPct = Math.min(100, Math.round(progress));

  const statusLabel = useMemo(() => {
    if (progressPct < 28) return 'Yeni sürüm indiriliyor';
    if (progressPct < 58) return 'Önbellek güncelleniyor';
    if (progressPct < 88) return 'Arayüz yenileniyor';
    return 'Neredeyse hazır';
  }, [progressPct]);

  useEffect(() => {
    startedAtRef.current = Date.now();
    let rafId = 0;

    const tick = () => {
      const elapsed = Date.now() - startedAtRef.current;
      const t = Math.min(1, elapsed / UPDATE_DURATION_MS);
      const eased = 1 - (1 - t) ** 2.1;
      const target = Math.min(96, eased * 96 + Math.sin(elapsed / 180) * 0.6);
      setProgress((prev) => {
        const next = prev + (target - prev) * 0.12;
        return Math.abs(target - next) < 0.08 ? target : next;
      });
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[99999] overflow-hidden text-slate-900 animate-fade-in-fast"
      role="alert"
      aria-live="polite"
      aria-busy="true"
      aria-label="Uygulama güncelleniyor"
    >
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(165deg, ${accentLight} 0%, #ffffff 42%, #f1f5f9 100%)`,
        }}
      />
      <UpdateOrbs accent={accent} />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `radial-gradient(${accent}12 1px, transparent 1px)`,
          backgroundSize: '26px 26px',
        }}
      />

      <div className="relative z-10 flex min-h-full flex-col items-center justify-center px-8 pt-[env(safe-area-inset-top,0px)] pb-[max(2.5rem,env(safe-area-inset-bottom,0px))]">
        <div
          className="relative animate-splash-scale"
          style={{ width: 'min(52vw, 220px)', height: 'min(52vw, 220px)' }}
        >
          <div
            className="absolute inset-[-14%] rounded-full animate-update-orbit opacity-80"
            style={{
              background: `conic-gradient(from 0deg, transparent 0deg, ${accent}55 70deg, transparent 140deg, rgba(236,72,153,0.45) 220deg, transparent 300deg)`,
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
            }}
          />
          <div
            className="absolute inset-[-8%] rounded-full blur-md animate-update-glow opacity-60"
            style={{
              background: `radial-gradient(circle, ${accent}35 0%, transparent 70%)`,
            }}
          />
          <div className="relative z-[1] flex h-full w-full items-center justify-center rounded-full bg-white/95 p-3 shadow-float ring-1 ring-white/80 backdrop-blur-sm">
            <img
              src={LOGO_SRC}
              alt=""
              draggable={false}
              className="h-full w-full object-contain"
            />
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center text-center animate-splash-reveal max-w-sm">
          <span
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.22em] border backdrop-blur-md"
            style={{
              color: accent,
              borderColor: `${accent}28`,
              backgroundColor: `${accent}0c`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: accent }}
            />
            Güncelleme
          </span>

          <h1 className="mt-5 font-display text-[1.65rem] font-bold tracking-[-0.04em] text-slate-900 leading-tight">
            Güncelleniyor
          </h1>
          <p className="mt-2 text-sm text-slate-500 font-medium leading-relaxed">
            {branchName} mobil uygulamasının en güncel sürümü yükleniyor.
            <span className="block mt-1 text-slate-400 text-xs">
              {isReloadPending
                ? 'Kapatıp açmanıza gerek yok — birkaç saniye içinde hazır.'
                : 'Güncelleme tamamlandı, devam ediliyor…'}
            </span>
          </p>
        </div>

        <div
          className="mt-10 w-[min(300px,86vw)] animate-splash-reveal"
          style={{ animationDelay: '0.12s' }}
        >
          <div className="mb-2.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em]">
            <span className="text-slate-400">{statusLabel}</span>
            <span className="tabular-nums" style={{ color: accent }}>
              {progressPct}%
            </span>
          </div>

          <div
            className="relative h-1 overflow-hidden rounded-full"
            style={{ backgroundColor: `${accent}14` }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-150 ease-premium"
              style={{
                width: `${progressPct}%`,
                background: `linear-gradient(90deg, ${accent}cc 0%, #ec4899 52%, ${accent} 100%)`,
                boxShadow: `0 0 20px ${accent}44`,
              }}
            >
              <div className="absolute inset-0 overflow-hidden rounded-full">
                <div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-splash-bar-shine" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
