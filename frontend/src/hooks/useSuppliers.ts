import { useQuery } from '@tanstack/react-query';
import { supplierService } from '../services/supplierService';

export const supplierKeys = {
  all: ['suppliers'] as const,
  lists: () => [...supplierKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...supplierKeys.lists(), filters] as const,
};

export const useSupplierOptions = (phanLoaiNCC?: 'NVL' | 'Thiết bị') => {
  return useQuery({
    queryKey: supplierKeys.list({ limit: 200, phanLoaiNCC }),
    queryFn: async () => {
      const response = await supplierService.getAllSuppliers(1, 200, undefined, phanLoaiNCC);
      // Throw on anything that is not a row array — the old code unwrapped with
      // `?? []`, which silently turned auth/network failures into an empty
      // supplier list that the UI rendered as "there are no suppliers".
      const rows = (response.data as any)?.data ?? response.data;
      if (!Array.isArray(rows)) {
        const message = (response as any)?.message || 'Không tải được danh sách nhà cung cấp';
        throw new Error(message);
      }
      return rows;
    },
    // Same 5-min freshness, BUT refetch the instant any window regains focus so
    // a supplier created on another tab/modal lands in the list automatically.
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};
