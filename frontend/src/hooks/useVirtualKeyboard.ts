import { useEffect, useState } from 'react';

/**
 * Detects if virtual keyboard is open (mobile/tablet).
 * Uses visualViewport API. Returns false on SSR or unsupported browsers.
 */
export default function useVirtualKeyboard(): boolean {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;

    const check = () => {
      setKeyboardOpen(vv.height < window.innerHeight * 0.75);
    };

    check();
    vv.addEventListener('resize', check);
    vv.addEventListener('scroll', check);
    return () => {
      vv.removeEventListener('resize', check);
      vv.removeEventListener('scroll', check);
    };
  }, []);

  return keyboardOpen;
}
