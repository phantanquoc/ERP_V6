import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import finishedProductService, {
  BulkReceiptPayload,
  ConfirmWarehouseReceiptInput,
  OutputStatisticsFilters,
} from '../services/finishedProductService';
import { warehouseKeys } from './useWarehouses';

// ─── Query key factory ────────────────────────────────────────────────────────

export const finishedProductKeys = {
  all: ['finishedProducts'] as const,
  lists: () => [...finishedProductKeys.all, 'list'] as const,
  list: (machineSystemId?: string) => [...finishedProductKeys.lists(), { machineSystemId }] as const,
  details: () => [...finishedProductKeys.all, 'detail'] as const,
  detail: (id: string) => [...finishedProductKeys.details(), id] as const,
  receiptRows: (id: string) => [...finishedProductKeys.detail(id), 'receiptRows'] as const,
  outputStatistics: (filters: OutputStatisticsFilters) =>
    [...finishedProductKeys.all, 'outputStatistics', filters] as const,
};

// ─── Lot-product query keys (for invalidation) ────────────────────────────────

export const lotProductKeys = {
  all: ['lotProducts'] as const,
  lists: () => [...lotProductKeys.all, 'list'] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Fetch pre-filled grade receipt rows for a finished product */
export const useFinishedProductReceiptRows = (finishedProductId: string) =>
  useQuery({
    queryKey: finishedProductKeys.receiptRows(finishedProductId),
    queryFn: () => finishedProductService.getReceiptRows(finishedProductId),
    enabled: !!finishedProductId,
  });

/** Fetch output statistics with date-range + optional filters */
export const useOutputStatistics = (filters: OutputStatisticsFilters, enabled = true) =>
  useQuery({
    queryKey: finishedProductKeys.outputStatistics(filters),
    queryFn: () => finishedProductService.getOutputStatistics(filters),
    enabled: enabled && !!filters.dateFrom && !!filters.dateTo,
  });

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Bulk confirm warehouse receipt for multiple fry-batches (maChien).
 * On success, invalidates warehouse, finished-product, and lot-product caches.
 */
export const useBulkConfirmFinishedProductReceipt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: BulkReceiptPayload) =>
      finishedProductService.bulkConfirmWarehouseReceipt(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lotProducts() });
      queryClient.invalidateQueries({ queryKey: finishedProductKeys.lists() });
      queryClient.invalidateQueries({ queryKey: lotProductKeys.lists() });
    },
  });
};
export const useConfirmFinishedProductWarehouseReceipt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ finishedProductId, input }: { finishedProductId: string; input: ConfirmWarehouseReceiptInput }) =>
      finishedProductService.confirmWarehouseReceipt(finishedProductId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lotProducts() });
      queryClient.invalidateQueries({ queryKey: finishedProductKeys.lists() });
    },
  });
};
