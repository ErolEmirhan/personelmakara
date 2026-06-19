import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export const SLIDE_PANEL_MS = 380;

/**
 * Güvenilir kaydırma animasyonu: açılışta her zaman kapalı konumdan başlar,
 * kapanışta süre dolana kadar DOM'da kalır.
 */
export function useSlidePanelTransition(open, duration = SLIDE_PANEL_MS) {
  const [present, setPresent] = useState(false);
  const [shown, setShown] = useState(false);
  const panelRef = useRef(null);

  useLayoutEffect(() => {
    if (open) {
      setPresent(true);
      setShown(false);
    } else {
      setShown(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !present) return undefined;

    let frame1 = 0;
    let frame2 = 0;
    let cancelled = false;

    frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        if (cancelled) return;
        const el = panelRef.current;
        if (el) void el.getBoundingClientRect();
        setShown(true);
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
    };
  }, [open, present]);

  useEffect(() => {
    if (open || !present) return undefined;
    const timer = window.setTimeout(() => setPresent(false), duration);
    return () => clearTimeout(timer);
  }, [open, present, duration]);

  return { present, shown, panelRef, duration };
}
