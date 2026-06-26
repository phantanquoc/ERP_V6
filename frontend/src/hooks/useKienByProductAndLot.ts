import { useQuery } from '@tanstack/react-query';
import lotProductService from '../services/lotProductService';
import type { LotProduct } from '../services/lotProductService';

export const kienByProductAndLotKeys = {
  all: ['kienByProductAndLot'] as const,
  lists: () => [...kienByProductAndLotKeys.all, 'list'] as const,
  list: (internationalProductId: string, lotId: string) =>
    [...kienByProductAndLotKeys.lists(), internationalProductId, lotId] as const,
};

export function useKienByProductAndLot(
  internationalProductId: string | null | undefined,
  lotId: string | null | undefined
) {
  return useQuery<LotProduct[]>({
    queryKey: kienByProductAndLotKeys.list(internationalProductId ?? '', lotId ?? ''),
    queryFn: async () => {
      const response = await lotProductService.getKienByProductAndLot(
        internationalProductId!,
        lotId!
      );
      return response.data;
    },
    enabled: !!internationalProductId && !!lotId,
  });
}
