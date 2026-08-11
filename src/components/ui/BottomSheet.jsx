import { useCallback, useEffect, useRef, useState } from 'react';
import { useBackHandler } from '../../hooks/useBackButton';
import { useOverlayTransition } from '../../hooks/useOverlayTransition';

const DISMISS_THRESHOLD_PX = 72;
const DISMISS_VELOCITY = 0.45;

export function BottomSheet({
  open,
  onClose,
  children,
  title,
  subtitle,
  footer,
  zIndexClass = 'z-[80]',
  enableSwipeToClose = true,
}) {
  const { present, shown, panelRef, duration, ease } = useOverlayTransition(open);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({
    startY: 0,
    lastY: 0,
    lastTime: 0,
    pointerId: null,
  });

  const resetDrag = useCallback(() => {
    dragRef.current.pointerId = null;
    setIsDragging(false);
    setDragOffset(0);
  }, []);

  useEffect(() => {
    if (!present) resetDrag();
  }, [present, resetDrag]);

  useEffect(() => {
    if (!open) resetDrag();
  }, [open, resetDrag]);

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

  const finishDrag = useCallback((event) => {
    if (dragRef.current.pointerId == null) return;
    if (event.pointerId !== dragRef.current.pointerId) return;

    const delta = Math.max(0, event.clientY - dragRef.current.startY);
    const dt = Math.max(1, event.timeStamp - dragRef.current.lastTime);
    const velocity = (event.clientY - dragRef.current.lastY) / dt;

    setIsDragging(false);
    dragRef.current.pointerId = null;

    if (delta > DISMISS_THRESHOLD_PX || velocity > DISMISS_VELOCITY) {
      setDragOffset(0);
      onClose();
      return;
    }

    setDragOffset(0);
  }, [onClose]);

  useEffect(() => {
    if (!isDragging) return undefined;

    const onMove = (event) => {
      if (event.pointerId !== dragRef.current.pointerId) return;
      const delta = Math.max(0, event.clientY - dragRef.current.startY);
      dragRef.current.lastY = event.clientY;
      dragRef.current.lastTime = event.timeStamp;
      setDragOffset(delta);
    };

    const onUp = (event) => {
      if (event.pointerId !== dragRef.current.pointerId) return;
      finishDrag(event);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [isDragging, finishDrag]);

  const handleDragStart = (event) => {
    if (!enableSwipeToClose) return;
    dragRef.current = {
      startY: event.clientY,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      pointerId: event.pointerId,
    };
    setIsDragging(true);
    setDragOffset(0);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  if (!present) return null;

  const panelTransform = shown ? `translateY(${dragOffset}px)` : 'translateY(100%)';
  const dragging = isDragging || dragOffset > 0;

  return (
    <div className={`fixed inset-0 ${zIndexClass}`} role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[4px] transition-opacity"
        style={{
          opacity: shown && dragOffset === 0 ? 1 : Math.max(0.15, 1 - dragOffset / 280),
          transitionDuration: dragging ? '0ms' : `${duration}ms`,
          transitionTimingFunction: ease,
        }}
        onClick={onClose}
        aria-label="Kapat"
      />

      <div
        ref={panelRef}
        className="absolute inset-x-0 bottom-0 flex flex-col max-h-[min(88dvh,720px)] bg-white rounded-t-[1.75rem] shadow-panel"
        style={{
          transform: panelTransform,
          transitionDuration: dragging ? '0ms' : `${duration}ms`,
          transitionTimingFunction: ease,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`shrink-0 ${enableSwipeToClose ? 'touch-none cursor-grab active:cursor-grabbing' : ''}`}
          onPointerDown={handleDragStart}
        >
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 rounded-full bg-slate-300/90" aria-hidden />
          </div>

          {(title || subtitle) && (
            <div className="px-6 pt-0 pb-4 border-b border-slate-100/90">
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
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-slate-100/90 bg-white pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
