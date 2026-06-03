import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import faultRecordService, {
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

export const useCreateFaultRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, file }: { data: CreateFaultRecordRequest; file?: File }) =>
      faultRecordService.create(data, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: faultRecordKeys.lists() });
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
    },
  });
};

export const useDeleteFaultRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => faultRecordService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: faultRecordKeys.lists() });
    },
  });
};
