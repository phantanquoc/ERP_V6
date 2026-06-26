import { useQuery } from '@tanstack/react-query';
import lotProductService from '../services/lotProductService';
import type { Lot } from '../services/lotProductService';

export const lotsByProductKeys = {
  all: ['lotsByProduct'] as const,
  lists: () => [...lotsByProductKeys.all, 'list'] as const,
  list: (internationalProductId: string) => [...lotsByProductKeys.lists(), internationalProductId] as const,
};

export function useLotsByProduct(internationalProductId: string | null | undefined) {
  return useQuery<Lot[]>({
    queryKey: lotsByProductKeys.list(internationalProductId ?? ''),
    queryFn: async () => {
      const response = await lotProductService.getLotsByProduct(internationalProductId!);
      return response.data;
    },
    enabled: !!internationalProductId,
  });
}
