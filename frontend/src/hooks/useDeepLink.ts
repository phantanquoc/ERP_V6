import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Generic single-param URL ↔ state sync.
 *
 * Extracts `key` from the URL, keeps local state in sync with browser
 * navigation (back/forward, pasted links, notification deep-links), and
 * writes back through `setValue` without creating a loop (syncingRef).
 *
 * This is the primitive behind `useUrlTab` / `useUrlDetailId` in
 * `useUrlState.ts` — exposed here as a reusable building block so new
 * pages don't re-implement the same searchParams + syncingRef dance.
 *
 * Usage:
 *   const { value, setValue } = useDeepLink('tab', 'overview');
 *   // value is always the URL truth on mount (or defaultValue)
 *   // setValue('other') updates both state and URL (replace: true)
 */
export function useDeepLink<T extends string>(
  key: string,
  defaultValue: T,
  opts?: { isValid?: (v: string | null) => v is T },
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const isValid = opts?.isValid;
  const raw = searchParams.get(key);
  const initial: T = raw !== null && (!isValid || isValid(raw)) ? (raw as T) : defaultValue;
  const [value, setValueState] = useState<T>(initial);
  const syncingRef = useRef(false);

  // URL → state (back/forward, external navigation). Guard with syncingRef
  // so our own state→URL write does not echo back and cause a loop.
  const paramValue = searchParams.get(key);
  useEffect(() => {
    if (syncingRef.current) {
      syncingRef.current = false;
      return;
    }
    const next = searchParams.get(key);
    if (next === null) {
      if (value !== defaultValue && !isValid) {
        // No isValid guard: null means "absent" → reset to default so
        // clearing the param via back navigation is reflected.
        // When isValid is present (enum tab), absent param is handled by
        // caller's fallback; don't force it here.
        setValueState(defaultValue);
      }
      return;
    }
    if (isValid) {
      if (isValid(next) && next !== value) setValueState(next as T);
    } else if (next !== value) {
      setValueState(next as T);
    }
  }, [paramValue]); // eslint-disable-line react-hooks/exhaustive-deps — paramValue is searchParams.get(key) extracted above

  const setValue = useCallback(
    (next: T, extraParams?: Record<string, string | null>) => {
      setValueState(next);
      const params = new URLSearchParams(searchParams);
      if (next === defaultValue && !isValid) {
        // For free-form strings, clearing to default removes the param to keep URL clean.
        // Enum tabs always keep the param (caller passes isValid).
        params.delete(key);
      } else {
        params.set(key, next);
      }
      if (extraParams) {
        for (const [k, v] of Object.entries(extraParams)) {
          if (v === null) params.delete(k);
          else params.set(k, v);
        }
      }
      syncingRef.current = true;
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams, key, defaultValue, isValid],
  );

  return { value, setValue, searchParams, setSearchParams, syncingRef } as const;
}
