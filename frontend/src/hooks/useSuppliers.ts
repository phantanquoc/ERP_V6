import { useQuery } from '@tanstack/react-query';
import { supplierService } from '../services/supplierService';

export const supplierKeys = {
  all: ['suppliers'] as const,
  lists: () => [...supplierKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...supplierKeys.lists(), filters] as const,
};

export const useSupplierOptions = () => {
  return useQuery({
    queryKey: supplierKeys.list({ limit: 200 }),
    queryFn: async () => {
      const response = await supplierService.getAllSuppliers(1, 200);
      return (response.data as any)?.data || response.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
};
