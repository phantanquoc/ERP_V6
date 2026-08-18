import { useQuery } from '@tanstack/react-query';
import warehouseReceiptService from '../services/warehouseReceiptService';
import warehouseIssueService from '../services/warehouseIssueService';

export const warehouseSlipKeys = {
  receipts: () => ['warehouseReceipts'] as const,
  issues: () => ['warehouseIssues'] as const,
};

export const useWarehouseReceipts = () => {
  return useQuery({
    queryKey: warehouseSlipKeys.receipts(),
    queryFn: async () => {
      const res = await warehouseReceiptService.getAllWarehouseReceipts();
      const data = (res as any)?.data?.data ?? (res as any)?.data ?? [];
      return Array.isArray(data) ? data : [];
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
};

export const useWarehouseIssues = () => {
  return useQuery({
    queryKey: warehouseSlipKeys.issues(),
    queryFn: async () => {
      const res = await warehouseIssueService.getAllWarehouseIssues();
      const data = (res as any)?.data?.data ?? (res as any)?.data ?? [];
      return Array.isArray(data) ? data : [];
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
};
