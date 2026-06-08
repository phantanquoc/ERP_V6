import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
