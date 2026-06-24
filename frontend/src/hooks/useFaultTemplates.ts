import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import faultTemplateService, {
  CreateFaultTemplateRequest,
  FaultTemplateFilters,
  UpdateFaultTemplateRequest,
} from '../services/faultTemplateService';

export const faultTemplateKeys = {
  all: ['faultTemplates'] as const,
  lists: () => [...faultTemplateKeys.all, 'list'] as const,
  list: (filters: FaultTemplateFilters = {}) => [...faultTemplateKeys.lists(), filters] as const,
  details: () => [...faultTemplateKeys.all, 'detail'] as const,
  detail: (id: string) => [...faultTemplateKeys.details(), id] as const,
  summaries: () => [...faultTemplateKeys.all, 'summary'] as const,
  summary: (id: string) => [...faultTemplateKeys.summaries(), id] as const,
};

export const useFaultTemplates = (filters: FaultTemplateFilters = {}) =>
  useQuery({
    queryKey: faultTemplateKeys.list(filters),
    queryFn: () => faultTemplateService.getAll(filters),
  });

export const useFaultTemplate = (id: string) =>
  useQuery({
    queryKey: faultTemplateKeys.detail(id),
    queryFn: () => faultTemplateService.getById(id),
    enabled: !!id,
  });

// Task 5.2: useTemplateSummary hook
export const useTemplateSummary = (id: string | null | undefined) =>
  useQuery({
    queryKey: faultTemplateKeys.summary(id ?? ''),
    queryFn: () => faultTemplateService.getSummary(id!),
    enabled: !!id,
  });

// Task 5.1: useTemplateSearch hook — debounced, enabled when search >= 2 chars
export const useTemplateSearch = (
  search: string,
  options?: { machineSystemId?: string; limit?: number },
) => {
  const debouncedSearch = useDebounce(search, 300);
  return useQuery({
    queryKey: faultTemplateKeys.list({
      search: debouncedSearch,
      machineSystemId: options?.machineSystemId,
      limit: options?.limit ?? 10,
      activeOnly: true,
    }),
    queryFn: () =>
      faultTemplateService.getAll({
        search: debouncedSearch,
        machineSystemId: options?.machineSystemId,
        limit: options?.limit ?? 10,
        activeOnly: true,
      }),
    enabled: debouncedSearch.length >= 2,
  });
};

// Simple debounce hook used by useTemplateSearch
function useDebounce(value: string, delay: number): string {
  const [debouncedValue] = useDebouncedState(value, delay);
  return debouncedValue;
}

function useDebouncedState(value: string, delay: number): [string, (v: string) => void] {
  const [state, setState] = useSyncedState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debounced = useMemo(() => {
    return (newValue: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setState(newValue);
      }, delay);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay]);

  // Sync external value changes
  useMemo(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setState(value);
    }, delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return [state, debounced];
}

// Simple useState wrapper with ref for stable identity
function useSyncedState(initial: string): [string, (v: string) => void] {
  return useState(initial);
}

// Task 5.3: useCreateFaultTemplate and useUpdateFaultTemplate updated to include repairSteps in payload
export const useCreateFaultTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, file }: { data: CreateFaultTemplateRequest; file?: File }) =>
      faultTemplateService.create(data, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: faultTemplateKeys.lists() });
    },
  });
};

export const useUpdateFaultTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, file }: { id: string; data: UpdateFaultTemplateRequest; file?: File }) =>
      faultTemplateService.update(id, data, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: faultTemplateKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: faultTemplateKeys.summary(variables.id) });
      queryClient.invalidateQueries({ queryKey: faultTemplateKeys.lists() });
    },
  });
};

export const useDeactivateFaultTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => faultTemplateService.deactivate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: faultTemplateKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: faultTemplateKeys.lists() });
    },
  });
};

export const useDeleteFaultTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => faultTemplateService.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: faultTemplateKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: faultTemplateKeys.lists() });
    },
  });
};
