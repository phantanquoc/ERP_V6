import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import supplyRequestService, {
  PartialFulfillPayload,
} from '../services/supplyRequestService';

export const supplyRequestKeys = {
  all: ['supply-requests'] as const,
  lists: () => [...supplyRequestKeys.all, 'list'] as const,
  list: (page: number, limit: number, search?: string) =>
    [...supplyRequestKeys.lists(), { page, limit, search }] as const,
  detail: (id: string) => [...supplyRequestKeys.all, 'detail', id] as const,
  decisions: (id: string) => [...supplyRequestKeys.all, 'decisions', id] as const,
};

export const useSupplyRequests = (
  page: number = 1,
  limit: number = 10,
  search?: string
) => {
  return useQuery({
    queryKey: supplyRequestKeys.list(page, limit, search),
    queryFn: async () => {
      const response = await supplyRequestService.getAllSupplyRequests(
        page,
        limit,
        search
      );
      return response;
    },
  });
};

export const useSupplyRequestDecisions = (supplyRequestId: string | undefined) => {
  return useQuery({
    queryKey: supplyRequestKeys.decisions(supplyRequestId ?? ''),
    queryFn: async () => {
      if (!supplyRequestId) return { data: [] };
      const response = await supplyRequestService.getDecisionHistory(supplyRequestId);
      return response;
    },
    enabled: !!supplyRequestId,
  });
};

export const usePartialFulfillItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      itemId,
      payload,
    }: {
      itemId: string;
      payload: PartialFulfillPayload;
    }) => {
      const response = await supplyRequestService.partialFulfillItem(itemId, payload);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplyRequestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplyRequestKeys.all });
    },
  });
};
