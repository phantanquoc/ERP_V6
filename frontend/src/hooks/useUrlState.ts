import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * URL-backed UI state.
 *
 * Why this exists: most pages kept tabs, detail modals and filters in plain
 * useState, so reloading the page (or pressing Back, or sharing a link) threw
 * the user back to the first tab with the record they were looking at gone.
 *
 * The pattern mirrors the one already proven in `TechnicalQuality.tsx`:
 *  - ONE URL→state effect, guarded by a ref so our own writes don't echo back
 *  - state→URL writes go through `new URLSearchParams(searchParams)` so
 *    unrelated query params survive instead of being wiped
 */

/** Tab (or any single-value enum) that lives in `?<paramKey>=`. */
export function useUrlTab<T extends string>(
  paramKey: string,
  isValid: (value: string | null) => value is T,
  fallback: T,
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = searchParams.get(paramKey);
  const [value, setValue] = useState<T>(isValid(initial) ? initial : fallback);
  const syncingRef = useRef(false);

  // URL → state: back/forward, pasted links, notification deep-links
  useEffect(() => {
    if (syncingRef.current) {
      syncingRef.current = false;
      return;
    }
    const next = searchParams.get(paramKey);
    if (isValid(next) && next !== value) setValue(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // state → URL, preserving every other param already on the URL
  const set = useCallback(
    (next: T) => {
      setValue(next);
      const params = new URLSearchParams(searchParams);
      params.set(paramKey, next);
      syncingRef.current = true;
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams, paramKey],
  );

  return { value, set, searchParams, setSearchParams } as const;
}

/**
 * Deep-linkable detail record (e.g. `?supplyRequestId=<cuid>`).
 *
 * `open` pushes into history so the browser Back button closes the record
 * instead of leaving the whole page; `close` replaces so the id does not
 * linger and re-open the record on the next mount.
 */
export function useUrlDetailId(paramKey: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const syncingRef = useRef(false);
  const id = searchParams.get(paramKey);

  const open = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams);
      params.set(paramKey, value);
      syncingRef.current = true;
      setSearchParams(params, { replace: false });
    },
    [searchParams, setSearchParams, paramKey],
  );

  const close = useCallback(() => {
    if (!searchParams.has(paramKey)) return;
    const params = new URLSearchParams(searchParams);
    params.delete(paramKey);
    syncingRef.current = true;
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams, paramKey]);

  return { id, open, close, syncingRef } as const;
}
