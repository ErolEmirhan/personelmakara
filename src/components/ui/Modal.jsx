import { createPortal } from 'react-dom';
import { useOverlayTransition } from '../../hooks/useOverlayTransition';

export function Modal({ open, onClose, children, title, className = '' }) {
  const { present, shown, panelRef, duration, ease } = useOverlayTransition(open);

  if (!present || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9000] flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Dialog'}
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/55 backdrop-blur-[4px] transition-opacity"
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
        className={`relative w-full max-w-md bg-white rounded-3xl shadow-float overflow-hidden transition-all ${className}`}
        style={{
          opacity: shown ? 1 : 0,
          transform: shown ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.98)',
          transitionDuration: `${duration}ms`,
          transitionTimingFunction: ease,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="px-6 pt-6 pb-2">
            <h3 className="text-xl font-bold text-gray-900 font-display tracking-tight">{title}</h3>
          </div>
        )}
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}
