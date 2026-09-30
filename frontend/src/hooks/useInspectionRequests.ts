import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import inspectionRequestService, {
  type CreateInspectionRequestRequest,
  type InspectionRequestFilters,
  type InspectionRequestStatsFilters,
  type InspectionRequestStatus,
  type UpdateInspectionRequestRequest,
} from '../services/inspectionRequestService';

// ── Query key factory ────────────────────────────────────────────────────
// Spec-required shape: { all, lists(status,page,limit), detail(id), statusHistory(id) }
export const inspectionKeys = {
  all: ['inspectionRequests'] as const,
  lists: (
    status?: InspectionRequestStatus | null,
    page?: number,
    limit?: number,
    search?: string | null,
  ) => [...inspectionKeys.all, 'list', status ?? null, page ?? null, limit ?? null, search ?? null] as const,
  _listByFilters: (filters: InspectionRequestFilters = {}) =>
    inspectionKeys.lists(
      filters.trangThai ?? null,
      filters.page ?? undefined,
      filters.limit ?? undefined,
      filters.search ?? null,
    ),
  listsRoot: () => [...inspectionKeys.all, 'list'] as const,
  list: (filters: InspectionRequestFilters = {}) => inspectionKeys._listByFilters(filters),
  details: () => [...inspectionKeys.all, 'detail'] as const,
  detail: (id: number | string) => [...inspectionKeys.all, 'detail', String(id)] as const,
  statusHistory: (id: number | string) => [...inspectionKeys.all, 'statusHistory', String(id)] as const,
  generatedCode: () => [...inspectionKeys.all, 'generatedCode'] as const,
  stats: (filters?: InspectionRequestStatsFilters) => [...inspectionKeys.all, 'stats', filters ?? null] as const,
};

export const useInspectionRequests = (filters: InspectionRequestFilters = {}, opts?: { enabled?: boolean }) =>
  useQuery({
    queryKey: inspectionKeys._listByFilters(filters),
    queryFn: () => inspectionRequestService.getAll(filters),
    enabled: opts?.enabled ?? true,
  });

export const useInspectionRequest = (id: number | string | null | undefined) =>
  useQuery({
    queryKey: inspectionKeys.detail(id as number | string),
    queryFn: () => inspectionRequestService.getById(id!),
    enabled: !!id,
    retry: (failureCount, error) => {
      const status = (error as { response?: { status?: number }; status?: number })?.response?.status ?? (error as { status?: number })?.status;
      if (status === 404) return false;
      return failureCount < 2;
    },
  });

export const useGeneratedInspectionCode = () =>
  useQuery({
    queryKey: inspectionKeys.generatedCode(),
    queryFn: () => inspectionRequestService.generateCode(),
  });

export const useCreateInspectionRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, file }: { data: CreateInspectionRequestRequest; file?: File }) =>
      inspectionRequestService.create(data, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.all });
      queryClient.invalidateQueries({ queryKey: inspectionKeys.generatedCode() });
    },
  });
};

export const useUpdateInspectionRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, file }: { id: number | string; data: UpdateInspectionRequestRequest; file?: File }) =>
      inspectionRequestService.update(id, data, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: inspectionKeys.all });
    },
  });
};

export const useDeleteInspectionRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => inspectionRequestService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.all });
    },
  });
};

// ── Status transitions ─────────────────────────────────────────────────

export const useAcceptInspection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => inspectionRequestService.accept(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: inspectionKeys.all });
    },
  });
};

export const useCompleteInspection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => inspectionRequestService.complete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: inspectionKeys.all });
    },
  });
};

export const useStartInspection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => inspectionRequestService.startInspection(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: inspectionKeys.all });
    },
  });
};

export const useUpdateInspectionDetails = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, file }: { id: number | string; data: import('../services/inspectionRequestService').InspectionDetailsInput; file?: File }) =>
      inspectionRequestService.updateDetails(id, data, file),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: inspectionKeys.all });
    },
  });
};

export const useSubmitInspection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => inspectionRequestService.submitInspection(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: inspectionKeys.all });
    },
  });
};

export const useRejectInspection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number | string; reason?: string }) =>
      inspectionRequestService.reject(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: inspectionKeys.all });
    },
  });
};

export const useCancelInspection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number | string; reason?: string }) =>
      inspectionRequestService.cancel(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: inspectionKeys.all });
    },
  });
};

// ── Status history ─────────────────────────────────────────────────────
export const useInspectionStatusHistory = (id: number | string | null | undefined) =>
  useQuery({
    queryKey: inspectionKeys.statusHistory(id as number | string),
    queryFn: () => inspectionRequestService.getStatusHistory(id!),
    enabled: !!id,
    retry: (failureCount, error) => {
      const status = (error as { response?: { status?: number }; status?: number })?.response?.status ?? (error as { status?: number })?.status;
      if (status === 404) return false;
      return failureCount < 2;
    },
  });

// legacy alias kept for any external import
export const statusHistoryKeys = {
  all: ['inspectionRequestStatusHistory'] as const,
  history: (id: number | string) => inspectionKeys.statusHistory(id),
};

// ── Stats ──────────────────────────────────────────────────────────────
export const useInspectionRequestStats = (filters?: InspectionRequestStatsFilters, opts?: { enabled?: boolean }) =>
  useQuery({
    queryKey: inspectionKeys.stats(filters),
    queryFn: () => inspectionRequestService.getStats(filters),
    staleTime: 60_000,
    enabled: opts?.enabled ?? true,
  });
