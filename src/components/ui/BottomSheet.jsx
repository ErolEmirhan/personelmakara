import { useEffect } from 'react';
import { useBackHandler } from '../../hooks/useBackButton';

export function BottomSheet({
  open,
  onClose,
  children,
  title,
  subtitle,
  zIndexClass = 'z-[80]',
}) {
  useEffect(() => {
    if (!open) return undefined;
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
  }, [open, onClose]);

  useBackHandler(open, onClose);

  if (!open) return null;

  return (
    <div className={`fixed inset-0 ${zIndexClass}`} role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[3px] animate-fade-in"
        onClick={onClose}
        aria-label="Kapat"
      />

      <div
        className="absolute inset-x-0 bottom-0 flex flex-col max-h-[min(88dvh,720px)] bg-white rounded-t-[1.75rem] shadow-[0_-24px_64px_rgba(15,23,42,0.18)] animate-slide-up safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" aria-hidden />
        </div>

        {(title || subtitle) && (
          <div className="shrink-0 px-6 pt-2 pb-4 border-b border-slate-100">
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
