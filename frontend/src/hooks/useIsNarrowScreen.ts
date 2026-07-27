import { useState, useEffect } from 'react';

const NARROW_QUERY = '(max-width: 699px)';

/**
 * Detects narrow screens (portrait tablet / phone).
 * Uses matchMedia with a change listener — only fires on threshold crossing,
 * no debounce needed. SSR-safe.
 */
export default function useIsNarrowScreen(): boolean {
  const [isNarrow, setIsNarrow] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(NARROW_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(NARROW_QUERY);
    const handler = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    mql.addEventListener('change', handler);
    // Sync in case state diverged (e.g. HMR)
    setIsNarrow(mql.matches);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isNarrow;
}
