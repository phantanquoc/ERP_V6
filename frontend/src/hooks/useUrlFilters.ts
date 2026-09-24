import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * URL ↔ state sync for list filters (search, page, sort, enum filters).
 *
 * Keeps filter state shareable / reload-safe. The pattern mirrors
 * `useUrlTab` / `useUrlDetailId` in `useUrlState.ts`:
 *  - ONE URL→state effect guarded by syncingRef
 *  - state→URL writes clone searchParams so unrelated params survive
 *
 * This is optional — use it when a list repeats the same filter/search/
 * pagination/sort ↔ URL dance (e.g. FaultRecordList, RepairRequestList).
 * For one-off cases, keep the local searchParams + syncingRef inline.
 *
 * Each key maps to a string value. Numeric page is stored as string in URL
 * ("1", "2", …) and coerced here; empty string means "absent" (param deleted).
 */
type FilterConfig = Record<string, { defaultValue: string }>;

export function useUrlFilters<C extends FilterConfig>(config: C) {
  const [searchParams, setSearchParams] = useSearchParams();
  const syncingRef = useRef(false);

  const initialValues = Object.fromEntries(
    Object.entries(config).map(([key, { defaultValue }]) => [
      key,
      searchParams.get(key) ?? defaultValue,
    ]),
  ) as { [K in keyof C]: string };

  const [values, setValues] = useState<{ [K in keyof C]: string }>(initialValues);

  // URL → state (back/forward, pasted link). Guard with syncingRef to avoid echo.
  // Extract each param before the effect so deps are stable strings, not inline calls.
  const paramSnapshot = Object.keys(config)
    .map((k) => `${k}=${searchParams.get(k) ?? ''}`)
    .join('&');

  useEffect(() => {
    if (syncingRef.current) {
      syncingRef.current = false;
      return;
    }
    let changed = false;
    const next: Record<string, string> = {};
    for (const [key, { defaultValue }] of Object.entries(config)) {
      const raw = searchParams.get(key) ?? defaultValue;
      next[key] = raw;
      if (raw !== (values as Record<string, string>)[key]) changed = true;
    }
    if (changed) setValues(next as { [K in keyof C]: string });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramSnapshot]);

  const setValue = useCallback(
    (key: keyof C & string, value: string) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      const params = new URLSearchParams(searchParams);
      const def = config[key]?.defaultValue ?? '';
      if (value === '' || value === def) params.delete(key);
      else params.set(key, value);
      syncingRef.current = true;
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams, config],
  );

  const setMany = useCallback(
    (patch: Partial<{ [K in keyof C]: string }>) => {
      setValues((prev) => ({ ...prev, ...patch }));
      const params = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(patch)) {
        const def = (config as Record<string, { defaultValue: string }>)[key]?.defaultValue ?? '';
        if (value === '' || value === def) params.delete(key);
        else params.set(key, value as string);
      }
      syncingRef.current = true;
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams, config],
  );

  return { values, setValue, setMany, searchParams, setSearchParams, syncingRef } as const;
}
