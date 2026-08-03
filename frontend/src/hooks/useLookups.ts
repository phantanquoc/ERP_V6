import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import lookupService, {
  isCascadeConfirmation,
  LookupHistoryParams,
} from '../services/lookupService';
import type { CreateLookupData, Lookup, UpdateLookupData } from '../types/lookup';
import { LOOKUP_GROUPS } from '../types/lookup';

export { isCascadeConfirmation };

export const lookupKeys = {
  all: ['lookups'] as const,
  lists: () => [...lookupKeys.all, 'list'] as const,
  /**
   * `includeValue` is part of the key on purpose: a list that had a hidden label
   * appended for one record must never be reused as the option set for another
   * record (design.md Q2).
   */
  list: (group: string, opts?: { all?: boolean; includeValue?: string }) =>
    [...lookupKeys.lists(), group, opts?.all ?? false, opts?.includeValue ?? null] as const,
  details: () => [...lookupKeys.all, 'detail'] as const,
  detail: (id: string) => [...lookupKeys.details(), id] as const,
  usages: () => [...lookupKeys.all, 'usage'] as const,
  usage: (id: string) => [...lookupKeys.usages(), id] as const,
  histories: () => [...lookupKeys.all, 'history'] as const,
  groupHistory: (group: string, params?: LookupHistoryParams) =>
    [...lookupKeys.histories(), 'group', group, params ?? {}] as const,
  history: (id: string, params?: LookupHistoryParams) =>
    [...lookupKeys.histories(), id, params ?? {}] as const,
};

/** Reference data changes rarely — cache it for a while. */
const LOOKUP_STALE_TIME = 30 * 60 * 1000;

export interface UseLookupsOptions {
  /**
   * The value currently stored on the record being edited.
   *
   * EDIT MODE ONLY. When supplied and the label is not in the active list, it is
   * fetched with `all=true` and appended so the form can render the stored value
   * rather than silently blanking it on save. Omit for create/new-record forms —
   * those must only offer active entries.
   */
  includeValue?: string;
  enabled?: boolean;
}

/**
 * Active entries for a group, optionally retaining one hidden value for edit forms.
 *
 * Zero-data-loss note: callers MUST NOT reset or clear a field while `isLoading` is
 * true — an empty list during the initial fetch is not evidence that a stored value
 * is invalid.
 */
export const useLookups = (group: string, options?: UseLookupsOptions) => {
  const includeValue = options?.includeValue?.trim() ? options.includeValue : undefined;

  const query = useQuery({
    queryKey: lookupKeys.list(group, { includeValue }),
    // The backend appends the hidden value itself when `includeValue` is sent.
    queryFn: () => lookupService.list({ group, includeValue }),
    staleTime: LOOKUP_STALE_TIME,
    enabled: options?.enabled !== false && !!group,
  });

  /**
   * Defensive client-side guarantee. The backend already honours `includeValue`, but
   * if it ever returned a list without it we would silently drop the user's stored
   * value — so append it here too. Idempotent when the server did its job.
   */
  const data = useMemo<Lookup[]>(() => {
    const items = query.data ?? [];
    if (!includeValue) return items;
    if (items.some((item) => item.label === includeValue)) return items;
    return [
      ...items,
      {
        id: `__preserved__:${includeValue}`,
        group,
        code: `__PRESERVED__:${includeValue}`,
        label: includeValue,
        sortOrder: Number.MAX_SAFE_INTEGER,
        isActive: false,
        createdAt: '',
        updatedAt: '',
      },
    ];
  }, [query.data, includeValue, group]);

  return { ...query, data };
};

/** Admin view: every entry for a group including inactive ones. */
export const useLookupsAll = (group: string, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: lookupKeys.list(group, { all: true }),
    queryFn: () => lookupService.list({ group, all: true }),
    staleTime: LOOKUP_STALE_TIME,
    enabled: options?.enabled !== false && !!group,
  });

/**
 * Unit-of-measure options plus an `isKnownUnit` predicate for auto-fill guards.
 *
 * Replaces the old `DON_VI_TINH_OPTIONS.includes(x)` checks, which silently skipped
 * auto-fill for the 10 production products whose unit (Đôi, Can, Xe, Bịch, Xô, Miếng)
 * was missing from `constants/units.ts` — letting a user save `Đôi` as `Kg` with no
 * warning. The lookup table holds every value actually in use, so the check now passes.
 *
 * `isKnownUnit` returns false while the list is still loading or on error. Callers must
 * treat that as "don't auto-fill", never as "clear the field" — an unknown unit means
 * keep whatever the form already had.
 */
export const useUnitOptions = () => {
  const query = useLookups(LOOKUP_GROUPS.DON_VI_TINH);
  const units = query.data;

  const activeLabels = useMemo(
    () => new Set(units.filter((u) => u.isActive).map((u) => u.label)),
    [units]
  );

  const isKnownUnit = useMemo(
    () =>
      (value: string | null | undefined): value is string =>
        !!value && activeLabels.has(value),
    [activeLabels]
  );

  return { units, isKnownUnit, isLoading: query.isLoading, isError: query.isError };
};

export const useLookupUsage = (id: string, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: lookupKeys.usage(id),
    queryFn: () => lookupService.getUsage(id),
    enabled: options?.enabled !== false && !!id,
  });

export const useLookupHistory = (id: string, params?: LookupHistoryParams) =>
  useQuery({
    queryKey: lookupKeys.history(id, params),
    queryFn: () => lookupService.getHistory(id, params),
    enabled: !!id,
  });

export const useLookupGroupHistory = (group: string, params?: LookupHistoryParams) =>
  useQuery({
    queryKey: lookupKeys.groupHistory(group, params),
    queryFn: () => lookupService.getGroupHistory(group, params),
    enabled: !!group,
  });

export const useCreateLookup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLookupData) => lookupService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lookupKeys.lists() });
    },
  });
};

/**
 * Update a lookup.
 *
 * A label change on an in-use lookup rejects with a 409 whose body carries the cascade
 * detail — read it with `isCascadeConfirmation(error)` and resubmit with
 * `confirmCascade: true` once the admin confirms. A cascade rewrites business rows, so
 * usage and history caches are invalidated alongside the lists.
 */
export const useUpdateLookup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLookupData }) =>
      lookupService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lookupKeys.lists() });
      queryClient.invalidateQueries({ queryKey: lookupKeys.usages() });
      queryClient.invalidateQueries({ queryKey: lookupKeys.histories() });
    },
  });
};

/** Soft delete (isActive=false). Rejects with 400 while the label is still in use. */
export const useDeleteLookup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => lookupService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lookupKeys.lists() });
      queryClient.invalidateQueries({ queryKey: lookupKeys.histories() });
    },
  });
};
