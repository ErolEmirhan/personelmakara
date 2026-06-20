import { useEffect } from 'react';
import { useBackHandler } from '../../hooks/useBackButton';
import { useOverlayTransition } from '../../hooks/useOverlayTransition';

export function BottomSheet({
  open,
  onClose,
  children,
  title,
  subtitle,
  zIndexClass = 'z-[80]',
}) {
  const { present, shown, panelRef, duration, ease } = useOverlayTransition(open);

  useEffect(() => {
    if (!present) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [present, onClose]);

  useBackHandler(open, onClose);

  if (!present) return null;

  return (
    <div className={`fixed inset-0 ${zIndexClass}`} role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[4px] transition-opacity"
        style={{
          opacity: shown ? 1 : 0,
          transitionDuration: `${duration}ms`,
          transitionTimingFunction: ease,
        }}
        onClick={onClose}
        aria-label="Kapat"
      />

      <div
        ref={panelRef}
        className="absolute inset-x-0 bottom-0 flex flex-col max-h-[min(88dvh,720px)] bg-white rounded-t-[1.75rem] shadow-panel safe-bottom transition-transform"
        style={{
          transform: shown ? 'translateY(0)' : 'translateY(100%)',
          transitionDuration: `${duration}ms`,
          transitionTimingFunction: ease,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200/90" aria-hidden />
        </div>

        {(title || subtitle) && (
          <div className="shrink-0 px-6 pt-2 pb-4 border-b border-slate-100/90">
            {title && (
              <h2 className="text-xl font-display font-bold text-slate-900 tracking-tight">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}
