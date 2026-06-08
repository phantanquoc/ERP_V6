import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import repairRequestService, {
  CreateRepairRequestRequest,
  RepairRequestFilters,
  UpdateRepairRequestRequest,
} from '../services/repairRequestService';

export const repairRequestKeys = {
  all: ['repairRequests'] as const,
  lists: () => [...repairRequestKeys.all, 'list'] as const,
  list: (filters: RepairRequestFilters = {}) => [...repairRequestKeys.lists(), filters] as const,
  details: () => [...repairRequestKeys.all, 'detail'] as const,
  detail: (id: number | string) => [...repairRequestKeys.details(), id] as const,
  generatedCode: () => [...repairRequestKeys.all, 'generatedCode'] as const,
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
