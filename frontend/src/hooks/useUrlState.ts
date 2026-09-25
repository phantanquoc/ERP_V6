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

/**
 * Tab (or any single-value enum) that lives in `?<paramKey>=`.
 *
 * `scopedParams` declares which query params BELONG to which tab. Without it a
 * detail param outlives its owner: tab bodies render conditionally, so switching
 * tabs unmounts the component that owns `?warehouseId=` (or `?orderId=`, …) and
 * nothing is left to clean it up. Since `set` below deliberately preserves every
 * unrelated param, the orphan rides along to `?tab=products` where it means
 * nothing — and then re-selects that record when the user comes back, because the
 * remounting component reads it as a deep-link.
 *
 * Params absent from the table are never touched, so page-level state
 * (`?warehouseMonth=`, `?q=`, `?page=`) survives a tab switch exactly as before.
 * Declare the table as a module-level const; it is read through a ref, so an
 * inline literal is harmless but a stable identity is cheaper.
 */
export function useUrlTab<T extends string>(
  paramKey: string,
  isValid: (value: string | null) => value is T,
  fallback: T,
  scopedParams?: Record<T, readonly string[]>,
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = searchParams.get(paramKey);
  const [value, setValue] = useState<T>(isValid(initial) ? initial : fallback);
  const syncingRef = useRef(false);
  // Same ref pattern as useUrlListState below: keeps `set`'s identity stable
  // while still reading the caller's freshest table.
  const scopedRef = useRef(scopedParams);
  scopedRef.current = scopedParams;

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

  // state → URL, preserving every other param already on the URL.
  //
  // `extraParams` is for switching tab AND seeding a detail param in ONE write
  // (a card that jumps to the warehouse holding an item). Two writes cannot do
  // this: each clones the same stale `searchParams` snapshot, so whichever lands
  // second silently reverts the first — the same race AccountingAdmin documents
  // for its tab + period pair. Pass `null` to delete a key.
  const set = useCallback(
    (next: T, extraParams?: Record<string, string | null>) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        const cur = prev.get(paramKey);
        const curTab: T | null = cur && isValid(cur) ? cur : null;
        const isTopTabSwitch = curTab !== next;
        params.set(paramKey, next);
        if (isTopTabSwitch) {
          const table = scopedRef.current;
          if (table) {
            const keep = new Set(table[next] ?? []);
            for (const tab of Object.keys(table) as T[]) {
              for (const key of table[tab] ?? []) if (!keep.has(key)) params.delete(key);
            }
          }
        }
        if (extraParams) {
          for (const [key, v] of Object.entries(extraParams)) {
            if (v === null) params.delete(key);
            else params.set(key, v);
          }
        }
        return params;
      }, { replace: true });
      setValue(next);
      syncingRef.current = true;
    },
    [setSearchParams, paramKey],
  );

  return { value, set, searchParams, setSearchParams } as const;
}

/**
 * Deep-linkable detail record (e.g. `?supplyRequestId=<cuid>`).
 *
 * `open` pushes into history so Back closes the record instead of the page;
 * `close` replaces so the id does not linger. Pass `{replace:true}` when the
 * write merely *corrects* the URL (e.g. normalizing a `maKho` to its cuid) —
 * pushing would leave a dirty entry that Back returns to and re-corrects forever.
 */
export function useUrlDetailId(paramKey: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const syncingRef = useRef(false);
  const id = searchParams.get(paramKey);

  // Detail params are scoped to a top-tab (see TAB_SCOPED_PARAMS in
  // ProductionWarehouse). When the user switches top-tab (DSTK→DSNK etc.)
  // `activeTab` flips immediately but URL lags one render. If the user
  // clicks a row before URL catches up, `searchParams` still holds the old
  // tab and a plain `p.set(paramKey)` creates an orphan
  // (e.g. tab=inbound&issueId= on an inbound URL) that the orphan-cleanup
  // deletes right away — the exact
  // tab=inbound&issueId= → orphan → tab=inbound loop in your log.
  // Fix: force the owning tab atomically in the same write.
  const owningTab: string | null =
    paramKey === 'receiptId' || paramKey === 'inboundPlanId' ? 'inbound'
    : paramKey === 'issueId' || paramKey === 'outboundPlanId' ? 'outbound'
    : null;

  const open = useCallback(
    (value: string, opts?: { replace?: boolean }) => {
      syncingRef.current = true;
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        if (owningTab && p.get('tab') !== owningTab) p.set('tab', owningTab);
        p.set(paramKey, value);
        return p;
      }, { replace: opts?.replace ?? false });
    },
    [setSearchParams, paramKey, owningTab],
  );

  const close = useCallback(() => {
    syncingRef.current = true;
    setSearchParams((prev) => {
      if (!prev.has(paramKey)) return prev;
      const p = new URLSearchParams(prev);
      p.delete(paramKey);
      return p;
    }, { replace: true });
  }, [setSearchParams, paramKey]);

  return { id, open, close, syncingRef } as const;
}
/**
 * Single string param synced to URL (?key=value).
 * - Reads initial from searchParams, falls back to defaultValue.
 * - Writes with replace:true, deletes key when value is empty/null.
 * - Back/forward syncs via effect guarded by ref.
 * - Returns [value, setValue].
 */
export function useUrlStringParam(
  key: string,
  defaultValue: string,
  opts?: { validate?: (v: string) => boolean },
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const syncingRef = useRef(false);
  const raw = searchParams.get(key);
  const valid = raw !== null && raw !== "" && (!opts?.validate || opts.validate(raw));
  const [value, setValueInner] = useState<string>(valid ? raw! : defaultValue);

  useEffect(() => {
    if (syncingRef.current) { syncingRef.current = false; return; }
    const next = searchParams.get(key);
    if (next === null || next === "") {
      if (value !== defaultValue) setValueInner(defaultValue);
    } else if (opts?.validate && !opts.validate(next)) {
      // invalid param ignored, keep current value but clean URL lazily on next set
    } else if (next !== value) {
      setValueInner(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const setValue = useCallback((next: string) => {
    setValueInner(next);
    const params = new URLSearchParams(searchParams);
    if (!next) params.delete(key);
    else params.set(key, next);
    syncingRef.current = true;
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams, key]);

  return [value, setValue] as const;
}

/**
 * Generic filter bag synced to URL with optional prefix to scope per tab/sub-tab.
 * Each key maps to ?<prefix><key>=value. Empty values delete the param.
 * Values equal to their default are also omitted so ?in_plan_page=1 /
 * ?in_plan_sortBy=createdAt / ?in_plan_sortOrder=desc do not bloat the URL
 * and do not false-trigger the inboundSubTab prefix inference when the user
 * is on an unrelated tab (e.g. ?tab=products).
 */
export function useUrlFilters<T extends Record<string, string>>(
  defaults: T,
  opts?: { prefix?: string },
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const prefix = opts?.prefix ?? "";
  const syncingRef = useRef(false);

  const getValues = useCallback((): T => {
    const out: Record<string, string> = { ...defaults };
    for (const k of Object.keys(defaults)) {
      const v = searchParams.get(prefix + k);
      if (v !== null) out[k] = v;
    }
    return out as T;
  }, [searchParams, prefix, defaults]);

  const [values, setValuesInner] = useState<T>(() => getValues());

  useEffect(() => {
    if (syncingRef.current) { syncingRef.current = false; return; }
    const next = getValues();
    const changed = Object.keys(defaults).some(k => next[k] !== values[k]);
    if (changed) setValuesInner(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const valuesRef = useRef(values);
  valuesRef.current = values;

  const setValues = useCallback((patch: Partial<T> | ((prev: T) => T)) => {
    // DO NOT call setSearchParams inside setValuesInner's functional updater —
    // that nests a BrowserRouter update inside the caller's render phase and
    // triggers "Cannot update a component (BrowserRouter) while rendering".
    // Compute next from the freshest values ref, then issue both updates
    // sequentially outside any updater.
    const prev = valuesRef.current;
    const next = typeof patch === "function" ? (patch as (p: T) => T)(prev) : ({ ...prev, ...patch } as T);
    const params = new URLSearchParams(searchParams);
    for (const k of Object.keys(defaults)) {
      const v = next[k];
      const key = prefix + k;
      const d = (defaults as Record<string, string>)[k];
      if (!v || v === d) params.delete(key);
      else params.set(key, v);
    }
    syncingRef.current = true;
    setSearchParams(params, { replace: true });
    setValuesInner(next);
  }, [searchParams, setSearchParams, prefix, defaults]);

  return [values, setValues] as const;
}

