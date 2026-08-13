import { useQuery } from '@tanstack/react-query';
import inventoryService, { type InventoryFilters, type InventoryOverviewResponse } from '../services/inventoryService';

export const inventoryKeys = {
  all: ['inventory'] as const,
  overview: (params: InventoryFilters) => [...inventoryKeys.all, 'overview', params] as const,
};

export function useInventoryOverview(params: InventoryFilters) {
  return useQuery({
    queryKey: inventoryKeys.overview(params),
    queryFn: async (): Promise<InventoryOverviewResponse> => {
      const response = await inventoryService.getInventoryOverview(params);
      return response.data as InventoryOverviewResponse;
    },
    placeholderData: (prev) => prev,
  });
}
