import { useCallback, useEffect, useRef, useState } from 'react';
import { hapticLight } from '../../utils/haptic';

function moveItem(list, fromIndex, toIndex) {
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return list;
  const next = [...list];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function getRowIndexFromY(listRef, clientY) {
  const rows = listRef.current?.querySelectorAll('[data-reorder-row]');
  if (!rows?.length) return -1;

  for (let i = 0; i < rows.length; i += 1) {
    const rect = rows[i].getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    if (clientY < mid) return i;
  }

  return rows.length - 1;
}

function DragHandleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="9" cy="7" r="1.4" />
      <circle cx="15" cy="7" r="1.4" />
      <circle cx="9" cy="12" r="1.4" />
      <circle cx="15" cy="12" r="1.4" />
      <circle cx="9" cy="17" r="1.4" />
      <circle cx="15" cy="17" r="1.4" />
    </svg>
  );
}

export function ReorderList({ items, onChange, getLabel, getMeta }) {
  const [draggingIndex, setDraggingIndex] = useState(-1);
  const listRef = useRef(null);
  const dragIndexRef = useRef(-1);
  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const finishDrag = useCallback(() => {
    dragIndexRef.current = -1;
    setDraggingIndex(-1);
  }, []);

  useEffect(() => {
    if (draggingIndex < 0) return undefined;

    const onMove = (event) => {
      event.preventDefault();
      const from = dragIndexRef.current;
      if (from < 0) return;
      const target = getRowIndexFromY(listRef, event.clientY);
      if (target < 0 || target === from) return;
      dragIndexRef.current = target;
      setDraggingIndex(target);
      onChange(moveItem(itemsRef.current, from, target));
    };

    const onUp = () => {
      if (dragIndexRef.current >= 0) {
        hapticLight();
      }
      finishDrag();
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [draggingIndex, finishDrag, onChange]);

  const moveTo = (fromIndex, toIndex) => {
    onChange(moveItem(items, fromIndex, toIndex));
    hapticLight();
  };

  if (!items.length) {
    return (
      <p className="px-4 py-8 text-center text-sm text-slate-500">
        Sıralanacak öğe yok.
      </p>
    );
  }

  return (
    <div
      ref={listRef}
      className={`px-4 pb-4 space-y-2 max-h-[min(48dvh,400px)] overflow-y-auto scrollbar-hide ${
        draggingIndex >= 0 ? 'touch-none select-none' : ''
      }`}
    >
      {items.map((item, index) => {
        const isDragging = draggingIndex === index;
        const label = getLabel(item);
        const meta = getMeta?.(item);

        return (
          <div
            key={item.id}
            data-reorder-row
            className={`flex items-center gap-2 rounded-2xl border bg-white transition-shadow ${
              isDragging
                ? 'border-violet-300 shadow-lg ring-2 ring-violet-100 scale-[1.01]'
                : 'border-slate-100 shadow-sm'
            }`}
          >
            <button
              type="button"
              aria-label={`${label} sırasını değiştir`}
              className="shrink-0 px-3 py-4 text-slate-400 active:text-slate-600 touch-none"
              style={{ touchAction: 'none' }}
              onPointerDown={(event) => {
                event.preventDefault();
                dragIndexRef.current = index;
                setDraggingIndex(index);
                event.currentTarget.setPointerCapture?.(event.pointerId);
              }}
            >
              <DragHandleIcon />
            </button>

            <div className="flex-1 min-w-0 py-3 pr-1">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-slate-800 leading-snug truncate">
                    {label}
                  </p>
                  {meta && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{meta}</p>
                  )}
                </div>
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => moveTo(index, 0)}
                    aria-label={`${label} en üste taşı`}
                    className="shrink-0 px-2.5 py-1.5 rounded-lg bg-violet-50 text-violet-700 text-[11px] font-bold leading-none active:scale-95 transition-transform whitespace-nowrap"
                  >
                    En üste taşı
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col shrink-0 pr-2 gap-1">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => moveTo(index, index - 1)}
                aria-label={`${label} yukarı taşı`}
                className="w-9 h-9 rounded-xl bg-slate-50 text-slate-600 font-bold disabled:opacity-30 active:scale-95 transition-transform"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={index === items.length - 1}
                onClick={() => moveTo(index, index + 1)}
                aria-label={`${label} aşağı taşı`}
                className="w-9 h-9 rounded-xl bg-slate-50 text-slate-600 font-bold disabled:opacity-30 active:scale-95 transition-transform"
              >
                ↓
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
