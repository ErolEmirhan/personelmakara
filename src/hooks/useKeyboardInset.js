import { useEffect, useState } from 'react';

/** Mobil klavye açıldığında alttan ne kadar kapladığını döner (px) */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;

    const update = () => {
      const overlap = window.innerHeight - viewport.height - viewport.offsetTop;
      setInset(Math.max(0, Math.round(overlap)));
    };

    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    window.addEventListener('orientationchange', update);

    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return inset;
}
