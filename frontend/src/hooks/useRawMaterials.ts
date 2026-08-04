import { useQuery } from '@tanstack/react-query';
import internationalProductService from '../services/internationalProductService';
import type { RawMaterial } from '../services/internationalProductService';

export const rawMaterialKeys = {
  all: ['rawMaterials'] as const,
  list: () => [...rawMaterialKeys.all, 'list'] as const,
};

export function useRawMaterials() {
  return useQuery<RawMaterial[]>({
    queryKey: rawMaterialKeys.list(),
    queryFn: async () => {
      const response = await internationalProductService.getRawMaterials();
      return response.data;
    },
  });
}
