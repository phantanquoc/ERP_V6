import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import sparePartService, { CreateSparePartRequest, SparePartFilters } from '../services/sparePartService';

export const sparePartKeys = {
  all: ['spareParts'] as const,
  lists: () => [...sparePartKeys.all, 'list'] as const,
  list: (filters: SparePartFilters) => [...sparePartKeys.lists(), filters] as const,
  stats: () => [...sparePartKeys.all, 'stats'] as const,
  details: () => [...sparePartKeys.all, 'detail'] as const,
  detail: (id: string) => [...sparePartKeys.details(), id] as const,
};

export const useSpareParts = (filters: SparePartFilters = {}) =>
  useQuery({
    queryKey: sparePartKeys.list(filters),
    queryFn: () => sparePartService.getAll(filters),
  });

export const useSparePartStats = () =>
  useQuery({
    queryKey: sparePartKeys.stats(),
    queryFn: () => sparePartService.getStats(),
  });

export const useCreateSparePart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, file }: { data: CreateSparePartRequest; file?: File }) =>
      sparePartService.create(data, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sparePartKeys.lists() }),
  });
};

export const useUpdateSparePart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, file }: { id: string; data: Partial<CreateSparePartRequest>; file?: File }) =>
      sparePartService.update(id, data, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: sparePartKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: sparePartKeys.lists() });
    },
  });
};

export const useDeleteSparePart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sparePartService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sparePartKeys.lists() }),
  });
};
