import { useQuery } from '@tanstack/react-query';
import inventoryService, { type InventoryFilters } from '../services/inventoryService';

export const inventoryKeys = {
  all: ['inventory'] as const,
  overview: (params: InventoryFilters) => [...inventoryKeys.all, 'overview', params] as const,
};

export function useInventoryOverview(params: InventoryFilters) {
  return useQuery({
    queryKey: inventoryKeys.overview(params),
    queryFn: async () => {
      const response = await inventoryService.getInventoryOverview(params);
      // response.data = { data: InventoryItem[], pagination: {...} }
      return response.data!;
    },
    placeholderData: (prev) => prev,
  });
}
