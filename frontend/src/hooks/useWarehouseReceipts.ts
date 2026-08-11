import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import warehouseReceiptService, {
  type WarehouseReceipt,
  type CreateWarehouseReceiptData,
  type UpdateWarehouseReceiptData,
} from '../services/warehouseReceiptService';

export const warehouseReceiptKeys = {
  all: ['warehouseReceipts'] as const,
  lists: () => [...warehouseReceiptKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...warehouseReceiptKeys.lists(), filters] as const,
  details: () => [...warehouseReceiptKeys.all, 'detail'] as const,
  detail: (id: string) => [...warehouseReceiptKeys.details(), id] as const,
};

export const useWarehouseReceipts = () => {
  return useQuery({
    queryKey: warehouseReceiptKeys.lists(),
    queryFn: async () => {
      const response = await warehouseReceiptService.getAllWarehouseReceipts();
      return response.data as WarehouseReceipt[];
    },
  });
};

export const useWarehouseReceipt = (id: string) => {
  return useQuery({
    queryKey: warehouseReceiptKeys.detail(id),
    queryFn: async () => {
      const response = await warehouseReceiptService.getWarehouseReceiptById(id);
      return response.data as WarehouseReceipt;
    },
    enabled: !!id,
  });
};

export const useCreateWarehouseReceipt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWarehouseReceiptData) =>
      warehouseReceiptService.createWarehouseReceipt(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseReceiptKeys.lists() });
    },
  });
};

export const useUpdateWarehouseReceipt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWarehouseReceiptData }) =>
      warehouseReceiptService.updateWarehouseReceipt(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseReceiptKeys.lists() });
    },
  });
};

export const useDeleteWarehouseReceipt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => warehouseReceiptService.deleteWarehouseReceipt(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseReceiptKeys.lists() });
    },
  });
};
