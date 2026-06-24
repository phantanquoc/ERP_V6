import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import faultRecordService, {
  CreateFaultRecordFromTemplateRequest,
  CreateFaultRecordRequest,
  UpdateFaultRecordRequest,
  FaultRecordFilters,
} from '../services/faultRecordService';

export const faultRecordKeys = {
  all: ['faultRecords'] as const,
  lists: () => [...faultRecordKeys.all, 'list'] as const,
  list: (filters: FaultRecordFilters) => [...faultRecordKeys.lists(), filters] as const,
  details: () => [...faultRecordKeys.all, 'detail'] as const,
  detail: (id: string) => [...faultRecordKeys.details(), id] as const,
  stats: (machineSystemId?: string) => [...faultRecordKeys.all, 'stats', machineSystemId ?? null] as const,
  heatmap: (machineSystemId?: string) => [...faultRecordKeys.all, 'heatmap', machineSystemId ?? null] as const,
  recurrence: (faultTemplateId: string, machineSystemDetailId: string) =>
    [...faultRecordKeys.all, 'recurrence', faultTemplateId, machineSystemDetailId] as const,
};

export const useFaultRecords = (filters: FaultRecordFilters = {}) => {
  return useQuery({
    queryKey: faultRecordKeys.list(filters),
    queryFn: () => faultRecordService.getAll(filters),
  });
};

export const useFaultRecord = (id: string) => {
  return useQuery({
    queryKey: faultRecordKeys.detail(id),
    queryFn: () => faultRecordService.getById(id),
    enabled: !!id,
  });
};

export const useFaultRecordStats = (machineSystemId?: string) => {
  return useQuery({
    queryKey: faultRecordKeys.stats(machineSystemId),
    queryFn: () => faultRecordService.getStats(machineSystemId),
  });
};

export const useFaultHeatmap = (machineSystemId?: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: faultRecordKeys.heatmap(machineSystemId),
    queryFn: () => faultRecordService.getHeatmap(machineSystemId),
    enabled: options?.enabled ?? true,
  });
};

export const useFaultRecurrence = ({
  faultTemplateId,
  machineSystemDetailId,
}: {
  faultTemplateId: string;
  machineSystemDetailId: string;
}) => {
  return useQuery({
    queryKey: faultRecordKeys.recurrence(faultTemplateId, machineSystemDetailId),
    queryFn: () => faultRecordService.getRecurrence({ faultTemplateId, machineSystemDetailId }),
    enabled: Boolean(faultTemplateId && machineSystemDetailId),
  });
};

export const useCreateFaultRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, file }: { data: CreateFaultRecordRequest; file?: File }) =>
      faultRecordService.create(data, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: faultRecordKeys.lists() });
      queryClient.invalidateQueries({ queryKey: faultRecordKeys.stats() });
    },
  });
};

export const useCreateFaultRecordFromTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, file }: { data: CreateFaultRecordFromTemplateRequest; file?: File }) =>
      faultRecordService.createFromTemplate(data, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: faultRecordKeys.lists() });
      queryClient.invalidateQueries({ queryKey: faultRecordKeys.stats() });
    },
  });
};

export const useUpdateFaultRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, file }: { id: string; data: UpdateFaultRecordRequest; file?: File }) =>
      faultRecordService.update(id, data, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: faultRecordKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: faultRecordKeys.lists() });
      queryClient.invalidateQueries({ queryKey: faultRecordKeys.stats() });
    },
  });
};

export const useDeleteFaultRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => faultRecordService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: faultRecordKeys.lists() });
      queryClient.invalidateQueries({ queryKey: faultRecordKeys.stats() });
    },
  });
};
