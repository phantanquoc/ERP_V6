import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import replenishmentRequestService, {
  ReplenishmentFilters,
  UpdateReplenishmentRequestPayload,
} from '../services/replenishmentRequestService';

// Query keys for invalidation. Purchase requests share the same cache surface as
// YCBS after conversion (YCBS Đã chuyển → YCMH Chờ duyệt appears in that list).
const purchaseRequestCacheKeys = {
  all: ['purchase-requests'] as const,
  lists: () => ['purchase-requests', 'list'] as const,
} as const;

export const replenishmentRequestKeys = {
  all: ['replenishment-requests'] as const,
  lists: () => [...replenishmentRequestKeys.all, 'list'] as const,
  list: (page: number, limit: number, search?: string, filters?: ReplenishmentFilters) =>
    [...replenishmentRequestKeys.lists(), { page, limit, search, filters }] as const,
  detail: (id: string) => [...replenishmentRequestKeys.all, 'detail', id] as const,
} as const;

export const useReplenishmentRequests = (
  page: number = 1,
  limit: number = 10,
  search?: string,
  month?: number,
  year?: number,
  filters?: ReplenishmentFilters,
) =>
  useQuery({
    queryKey: replenishmentRequestKeys.list(page, limit, search, filters),
    // Return the full ApiResponse ({ data, pagination }): apiClient does NOT unwrap
    // the JSON body, so `.data` here is the row array. (An earlier revision returned
    // `.data` early, which made ReplenishmentList read `rows.data` as rows — the
    // queue rendered empty despite the API returning rows.)
    queryFn: () =>
      replenishmentRequestService.getAllReplenishmentRequests(page, limit, search, month, year, filters),
  });

export const useReplenishmentRequestDetail = (id: string | undefined) =>
  useQuery({
    queryKey: replenishmentRequestKeys.detail(id ?? ''),
    queryFn: () => replenishmentRequestService.getReplenishmentRequestById(id!),
    enabled: !!id,
  });

export const useUpdateReplenishmentRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateReplenishmentRequestPayload }) =>
      replenishmentRequestService.updateReplenishmentRequest(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: replenishmentRequestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: replenishmentRequestKeys.detail(variables.id) });
    },
  });
};

export const useConvertReplenishmentRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => replenishmentRequestService.convertToPurchaseRequest(id),
    onSuccess: () => {
      // The YCBS leaves the replenishment list, and a new YCMH appears in /purchase-requests.
      queryClient.invalidateQueries({ queryKey: replenishmentRequestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchaseRequestCacheKeys.lists() });
      queryClient.invalidateQueries({ queryKey: replenishmentRequestKeys.all });
      queryClient.invalidateQueries({ queryKey: purchaseRequestCacheKeys.all });
    },
  });
};

export const useCancelReplenishmentRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, lyDoHuy }: { id: string; lyDoHuy: string }) =>
      replenishmentRequestService.cancelReplenishmentRequest(id, lyDoHuy),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: replenishmentRequestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: replenishmentRequestKeys.detail(id) });
    },
  });
};

export const useDeleteReplenishmentRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => replenishmentRequestService.deleteReplenishmentRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: replenishmentRequestKeys.lists() });
    },
  });
};
