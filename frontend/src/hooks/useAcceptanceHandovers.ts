import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import acceptanceHandoverService, {
  AcceptanceHandoverFilters,
  CreateAcceptanceHandoverRequest,
  UpdateAcceptanceHandoverRequest,
} from '../services/acceptanceHandoverService';
import { repairRequestKeys } from './useRepairRequests';

export const acceptanceHandoverKeys = {
  all: ['acceptanceHandovers'] as const,
  lists: () => [...acceptanceHandoverKeys.all, 'list'] as const,
  list: (filters: AcceptanceHandoverFilters = {}) => [...acceptanceHandoverKeys.lists(), filters] as const,
  details: () => [...acceptanceHandoverKeys.all, 'detail'] as const,
  detail: (id: string) => [...acceptanceHandoverKeys.details(), id] as const,
  generatedCode: () => [...acceptanceHandoverKeys.all, 'generatedCode'] as const,
};

export const useAcceptanceHandovers = (filters: AcceptanceHandoverFilters = {}) =>
  useQuery({
    queryKey: acceptanceHandoverKeys.list(filters),
    queryFn: () => acceptanceHandoverService.getAll(filters),
  });

export const useAcceptanceHandover = (id: string) =>
  useQuery({
    queryKey: acceptanceHandoverKeys.detail(id),
    queryFn: () => acceptanceHandoverService.getAcceptanceHandoverById(id),
    enabled: !!id,
  });

export const useGeneratedAcceptanceHandoverCode = () =>
  useQuery({
    queryKey: acceptanceHandoverKeys.generatedCode(),
    queryFn: () => acceptanceHandoverService.generateCode(),
  });

export const useCreateAcceptanceHandover = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, file }: { data: CreateAcceptanceHandoverRequest; file?: File }) =>
      acceptanceHandoverService.createAcceptanceHandover(data, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: acceptanceHandoverKeys.lists() });
      queryClient.invalidateQueries({ queryKey: acceptanceHandoverKeys.generatedCode() });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.detail(variables.data.repairRequestId) });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.lists() });
    },
  });
};

export const useUpdateAcceptanceHandover = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, file }: { id: string; data: UpdateAcceptanceHandoverRequest; file?: File }) =>
      acceptanceHandoverService.updateAcceptanceHandover(id, data, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: acceptanceHandoverKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: acceptanceHandoverKeys.lists() });
      if (variables.data.repairRequestId) {
        queryClient.invalidateQueries({ queryKey: repairRequestKeys.detail(variables.data.repairRequestId) });
      }
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.lists() });
    },
  });
};

export const useDeleteAcceptanceHandover = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => acceptanceHandoverService.deleteAcceptanceHandover(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: acceptanceHandoverKeys.lists() });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.lists() });
    },
  });
};
