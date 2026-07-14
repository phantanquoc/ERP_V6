import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import processTypeService, {
  ProcessTypeQuery,
  CreateProcessTypeData,
  UpdateProcessTypeData,
} from '../services/processTypeService';

export const processTypeKeys = {
  all: ['processTypes'] as const,
  lists: () => [...processTypeKeys.all, 'list'] as const,
  list: (params?: ProcessTypeQuery) => [...processTypeKeys.lists(), params ?? {}] as const,
  details: () => [...processTypeKeys.all, 'detail'] as const,
  detail: (id: string) => [...processTypeKeys.details(), id] as const,
};

export const useProcessTypes = (params?: ProcessTypeQuery) =>
  useQuery({
    queryKey: processTypeKeys.list(params),
    queryFn: () => processTypeService.getAll(params),
  });

export const useProcessType = (id: string) =>
  useQuery({
    queryKey: processTypeKeys.detail(id),
    queryFn: () => processTypeService.getById(id),
    enabled: !!id,
  });

export const useCreateProcessType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProcessTypeData) => processTypeService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: processTypeKeys.lists() });
    },
  });
};

export const useUpdateProcessType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProcessTypeData }) =>
      processTypeService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: processTypeKeys.lists() });
    },
  });
};

export const useDeleteProcessType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => processTypeService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: processTypeKeys.lists() });
    },
  });
};
