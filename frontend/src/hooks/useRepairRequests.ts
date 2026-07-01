import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import repairRequestService, {
  CreateRepairRequestRequest,
  RepairRequestFilters,
  RepairRequestStatsFilters,
  UpdateRepairRequestRequest,
} from '../services/repairRequestService';

export const repairRequestKeys = {
  all: ['repairRequests'] as const,
  lists: () => [...repairRequestKeys.all, 'list'] as const,
  list: (filters: RepairRequestFilters = {}) => [...repairRequestKeys.lists(), filters] as const,
  details: () => [...repairRequestKeys.all, 'detail'] as const,
  detail: (id: number | string) => [...repairRequestKeys.details(), id] as const,
  generatedCode: () => [...repairRequestKeys.all, 'generatedCode'] as const,
  stats: (filters?: RepairRequestStatsFilters) => [...repairRequestKeys.all, 'stats', filters ?? null] as const,
};

export const useRepairRequests = (filters: RepairRequestFilters = {}) =>
  useQuery({
    queryKey: repairRequestKeys.list(filters),
    queryFn: () => repairRequestService.getAll(filters),
  });

export const useRepairRequest = (id: number | string) =>
  useQuery({
    queryKey: repairRequestKeys.detail(id),
    queryFn: () => repairRequestService.getById(id),
    enabled: !!id,
  });

export const useGeneratedRepairRequestCode = () =>
  useQuery({
    queryKey: repairRequestKeys.generatedCode(),
    queryFn: () => repairRequestService.generateCode(),
  });

export const useCreateRepairRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, file }: { data: CreateRepairRequestRequest; file?: File }) =>
      repairRequestService.create(data, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.generatedCode() });
    },
  });
};

export const useUpdateRepairRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, file }: { id: number | string; data: UpdateRepairRequestRequest; file?: File }) =>
      repairRequestService.update(id, data, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.lists() });
    },
  });
};

export const useDeleteRepairRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => repairRequestService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.lists() });
    },
  });
};

// 7.4 Business-event mutations

export const useStartRepair = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => repairRequestService.startRepair(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.lists() });
    },
  });
};

export const useCancelRepair = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number | string; reason?: string }) =>
      repairRequestService.cancel(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.lists() });
    },
  });
};

// 7.4 Status history query key
const statusHistoryKeys = {
  all: ['repairRequestStatusHistory'] as const,
  history: (id: number | string) => [...statusHistoryKeys.all, id] as const,
};

export const useRepairStatusHistory = (id: number | string | null) =>
  useQuery({
    queryKey: statusHistoryKeys.history(id ?? ''),
    queryFn: () => repairRequestService.getStatusHistory(id!),
    enabled: !!id,
  });

// 9.2: Stats hook
export const useRepairRequestStats = (filters?: RepairRequestStatsFilters) =>
  useQuery({
    queryKey: repairRequestKeys.stats(filters),
    queryFn: () => repairRequestService.getStats(filters),
    staleTime: 60_000,
  });
