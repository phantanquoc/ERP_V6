import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import soakingPlanService, {
  CreateSoakingPlanInput,
  UpdateSoakingPlanInput,
  ListFilters,
} from '../services/soakingPlanService';

// ─── Query key factory ────────────────────────────────────────────────────────

export const soakingPlanKeys = {
  all: ['soakingPlans'] as const,
  lists: () => [...soakingPlanKeys.all, 'list'] as const,
  list: (filters?: ListFilters) => [...soakingPlanKeys.lists(), filters] as const,
  details: () => [...soakingPlanKeys.all, 'detail'] as const,
  detail: (id: string) => [...soakingPlanKeys.details(), id] as const,
  activeByProduct: (productId: string) => [...soakingPlanKeys.all, 'activeByProduct', productId] as const,
  plannableOrders: () => [...soakingPlanKeys.all, 'plannableOrders'] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export const useSoakingPlans = (filters?: ListFilters) =>
  useQuery({
    queryKey: soakingPlanKeys.list(filters),
    queryFn: () => soakingPlanService.listSoakingPlans(filters),
  });

export const useActiveByProductId = (productId: string | null) =>
  useQuery({
    queryKey: soakingPlanKeys.activeByProduct(productId || ''),
    queryFn: () => soakingPlanService.getActiveByProductId(productId!),
    enabled: !!productId,
  });

export const usePlannableOrders = (page = 1, limit = 20) =>
  useQuery({
    queryKey: [...soakingPlanKeys.plannableOrders(), { page, limit }],
    queryFn: () => soakingPlanService.listPlannableOrders(page, limit),
  });

// ─── Mutations ────────────────────────────────────────────────────────────────

export const useCreateSoakingPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSoakingPlanInput) => soakingPlanService.createSoakingPlan(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: soakingPlanKeys.lists() });
    },
  });
};

export const useUpdateSoakingPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSoakingPlanInput }) =>
      soakingPlanService.updateSoakingPlan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: soakingPlanKeys.lists() });
    },
  });
};

export const useCancelSoakingPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => soakingPlanService.cancelSoakingPlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: soakingPlanKeys.lists() });
    },
  });
};
