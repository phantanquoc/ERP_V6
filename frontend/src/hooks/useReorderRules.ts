import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import reorderRuleService, {
  CreateReorderRuleRequest,
  UpdateReorderRuleRequest,
} from '../services/reorderRuleService';

export const reorderRuleKeys = {
  all: ['reorder-rules'] as const,
  lists: () => [...reorderRuleKeys.all, 'list'] as const,
  list: (page: number, limit: number, search?: string, activeOnly?: boolean) =>
    [...reorderRuleKeys.lists(), { page, limit, search, activeOnly }] as const,
  detail: (id: string) => [...reorderRuleKeys.all, 'detail', id] as const,
  byProduct: (productId: string) =>
    [...reorderRuleKeys.all, 'by-product', productId] as const,
};

export const useReorderRules = (
  page: number = 1,
  limit: number = 20,
  search?: string,
  activeOnly?: boolean
) => {
  return useQuery({
    queryKey: reorderRuleKeys.list(page, limit, search, activeOnly),
    queryFn: async () =>
      reorderRuleService.getAll(page, limit, search, activeOnly),
  });
};

export const useReorderRuleByProduct = (productId?: string) => {
  return useQuery({
    queryKey: reorderRuleKeys.byProduct(productId ?? ''),
    queryFn: async () => {
      if (!productId) return { data: null };
      return reorderRuleService.getByProduct(productId);
    },
    enabled: !!productId,
  });
};

export const useCreateReorderRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateReorderRuleRequest) =>
      reorderRuleService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reorderRuleKeys.lists() });
    },
  });
};

export const useUpdateReorderRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateReorderRuleRequest;
    }) => reorderRuleService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reorderRuleKeys.all });
    },
  });
};

export const useDeleteReorderRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => reorderRuleService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reorderRuleKeys.lists() });
    },
  });
};
