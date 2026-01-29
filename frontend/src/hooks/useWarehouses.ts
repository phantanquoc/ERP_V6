import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import warehouseService, {
  CreateWarehouseData,
  CreateLotData,
  AddProductToLotData,
  MoveProductData
} from '../services/warehouseService';

// Query keys for cache management
export const warehouseKeys = {
  all: ['warehouses'] as const,
  lists: () => [...warehouseKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...warehouseKeys.lists(), filters] as const,
  details: () => [...warehouseKeys.all, 'detail'] as const,
  detail: (id: string) => [...warehouseKeys.details(), id] as const,
  lotProducts: () => [...warehouseKeys.all, 'lotProducts'] as const,
};

// Hook to get all warehouses
export const useWarehouses = () => {
  return useQuery({
    queryKey: warehouseKeys.lists(),
    queryFn: async () => {
      const response = await warehouseService.getAllWarehouses();
      return response.data.data;
    },
  });
};

// Hook to get all lot products
export const useLotProducts = () => {
  return useQuery({
    queryKey: warehouseKeys.lotProducts(),
    queryFn: async () => {
      const response = await warehouseService.getAllLotProducts();
      return response.data.data;
    },
  });
};

// Hook to create warehouse
export const useCreateWarehouse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWarehouseData) => warehouseService.createWarehouse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
    },
  });
};

// Hook to delete warehouse
export const useDeleteWarehouse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => warehouseService.deleteWarehouse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
    },
  });
};

// Hook to create lot
export const useCreateLot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLotData) => warehouseService.createLot(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
    },
  });
};

// Hook to delete lot
export const useDeleteLot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (lotId: string) => warehouseService.deleteLot(lotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
    },
  });
};

// Hook to add product to lot
export const useAddProductToLot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddProductToLotData) => warehouseService.addProductToLot(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lotProducts() });
    },
  });
};

// Hook to remove product from lot
export const useRemoveProductFromLot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => warehouseService.removeProductFromLot(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lotProducts() });
    },
  });
};

// Hook to move product between lots
export const useMoveProductBetweenLots = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MoveProductData) => warehouseService.moveProductBetweenLots(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lotProducts() });
    },
  });
};

// Hook to update product quantity
export const useUpdateProductQuantity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { soLuong?: number; donViTinh?: string; giaThanh?: number } }) =>
      warehouseService.updateProductQuantity(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lotProducts() });
    },
  });
};

