import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import warehouseService, {
  CreateWarehouseData,
  UpdateWarehouseData,
  CreateLotData,
  AddProductToLotData,
  MoveProductData,
  UpdateLotProductData,
  type WarehouseReceiptHistory,
} from '../services/warehouseService';

// Query keys for cache management
export const warehouseKeys = {
  all: ['warehouses'] as const,
  lists: () => [...warehouseKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...warehouseKeys.lists(), filters] as const,
  details: () => [...warehouseKeys.all, 'detail'] as const,
  detail: (id: string) => [...warehouseKeys.details(), id] as const,
  lotProducts: () => [...warehouseKeys.all, 'lotProducts'] as const,
  /** Prefix for every receipt-history query — invalidate this after any receipt mutation. */
  receiptHistories: () => [...warehouseKeys.all, 'receiptHistory'] as const,
  receiptHistory: (lotProductId: string) => [...warehouseKeys.receiptHistories(), lotProductId] as const,
};

// Hook to get all warehouses
export const useWarehouses = () => {
  return useQuery({
    queryKey: warehouseKeys.lists(),
    queryFn: async () => {
      const response = await warehouseService.getAllWarehouses();
      return response.data;
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

// Hook to get all lot products
export const useLotProducts = () => {
  return useQuery({
    queryKey: warehouseKeys.lotProducts(),
    queryFn: async () => {
      const response = await warehouseService.getAllLotProducts();
      return response.data;
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
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

// Hook to update warehouse
export const useUpdateWarehouse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWarehouseData }) =>
      warehouseService.updateWarehouse(id, data),
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

// Hook to update lot product (includes maKien)
export const useUpdateLotProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLotProductData }) =>
      warehouseService.updateLotProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lotProducts() });
    },
  });
};

// Hook to generate warehouse code (fire-on-demand, no caching)
export const useGenerateWarehouseCode = () => {
  return useMutation({
    mutationFn: async () => {
      const res = await warehouseService.generateWarehouseCode();
      const code = (res as any)?.data?.data?.code || (res as any)?.data?.code;
      return code as string | undefined;
    },
  });
};

// Hook to sync CAD floor-plan baseline (default lots per zone + physical slots). Admin-only.
export const useSyncWarehouseLayouts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await warehouseService.syncLayouts();
      // apiClient unwraps to the JSON body; stats live at .data.data or .data
      const body = (res as any)?.data ?? res;
      return (body?.data ?? body) as {
        warehousesUpserted: number;
        lotsCreated: number;
        lotsExisting: number;
        slotsCreated: number;
        slotsExisting: number;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lotProducts() });
    },
  });
};

// Hook to get receipt history for a lot product (lazy — only fetches when lotProductId is set)
export const useReceiptHistory = (lotProductId: string | null) => {
  return useQuery<WarehouseReceiptHistory[]>({
    queryKey: warehouseKeys.receiptHistory(lotProductId ?? ''),
    queryFn: async () => {
      // apiClient already unwraps to the JSON body, so the array is at .data
      const res = await warehouseService.getReceiptHistory(lotProductId!);
      return res.data ?? [];
    },
    enabled: !!lotProductId,
  });
};

