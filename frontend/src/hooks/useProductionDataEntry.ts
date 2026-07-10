import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import materialEvaluationService, { MaterialEvaluation } from '../services/materialEvaluationService';
import systemOperationService, { SystemOperation } from '../services/systemOperationService';
import finishedProductService, { FinishedProduct } from '../services/finishedProductService';

// ─── Query Key Factories ─────────────────────────────────────────────────────

export const productionEntryKeys = {
  all: ['productionEntry'] as const,
  batches: () => [...productionEntryKeys.all, 'batches'] as const,
  finishedProducts: () => [...productionEntryKeys.all, 'finishedProducts'] as const,
  systemOp: (maChien: string, machineSystemId: string) =>
    [...productionEntryKeys.all, 'systemOp', maChien, machineSystemId] as const,
  finishedProduct: (maChien: string, machineSystemId: string) =>
    [...productionEntryKeys.all, 'finishedProduct', maChien, machineSystemId] as const,
};

// ─── Hook: list all fry-batches (MaterialEvaluation) ─────────────────────────

export const useFryBatchCodes = () =>
  useQuery({
    queryKey: productionEntryKeys.batches(),
    queryFn: async (): Promise<MaterialEvaluation[]> => {
      // Fetch all pages by using a large limit
      const result = await materialEvaluationService.getAllMaterialEvaluations(1, 200);
      return result.data;
    },
  });

// ─── Hook: filter fry-batches by shift (ca) + production date (client-side) ──

/**
 * Filters MaterialEvaluation[] by shift number and local production date.
 * Uses local Y/M/D comparison (no toISOString) to avoid timezone issues.
 */
export function filterBatchesByShiftAndDate(
  batches: MaterialEvaluation[] | undefined,
  shift: number,
  productionDate: string // YYYY-MM-DD
): MaterialEvaluation[] {
  if (!batches) return [];
  return batches.filter((b) => {
    // Filter by ca (shift)
    if (b.ca !== shift) return false;
    // Filter by local date of thoiGianChien
    const d = new Date(b.thoiGianChien);
    const localYear = d.getFullYear();
    const localMonth = d.getMonth() + 1;
    const localDay = d.getDate();
    const localDateStr = `${localYear}-${String(localMonth).padStart(2, '0')}-${String(localDay).padStart(2, '0')}`;
    return localDateStr === productionDate;
  });
}

// ─── Hook: load all FinishedProducts for the board ───────────────────────────

export const useAllFinishedProducts = () =>
  useQuery({
    queryKey: productionEntryKeys.finishedProducts(),
    queryFn: async (): Promise<FinishedProduct[]> => {
      // Fetch with large limit to get all
      const result = await finishedProductService.getAllFinishedProducts(1, 500);
      return result.data;
    },
  });

/**
 * Index FinishedProduct records by (maChien, machineSystemId) for fast lookup.
 */
export function indexFinishedProducts(
  products: FinishedProduct[] | undefined,
  filteredBatches: MaterialEvaluation[],
  fryerIds: string[]
): Map<string, FinishedProduct> {
  const map = new Map<string, FinishedProduct>();
  if (!products) return map;

  const batchCodes = new Set(filteredBatches.map((b) => b.maChien));

  for (const fp of products) {
    if (!batchCodes.has(fp.maChien)) continue;
    if (!fp.machineSystemId || !fryerIds.includes(fp.machineSystemId)) continue;
    const key = `${fp.maChien}|${fp.machineSystemId}`;
    map.set(key, fp);
  }
  return map;
}

// ─── Mutation: PATCH multiple dirty FinishedProduct records ──────────────────

export interface DirtyRecord {
  id: string;
  data: Partial<FinishedProduct>;
}

export const useBatchUpdateFinishedProducts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (records: DirtyRecord[]) => {
      // PATCH each dirty record sequentially (could parallel but safer sequential)
      const results = [];
      for (const rec of records) {
        const result = await finishedProductService.updateFinishedProduct(rec.id, rec.data);
        results.push(result);
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productionEntryKeys.all });
    },
  });
};

// ─── Legacy hooks (kept for backward compat if needed elsewhere) ─────────────

export const useSystemOperationByBatchAndFryer = (maChien: string, machineSystemId: string) =>
  useQuery({
    queryKey: productionEntryKeys.systemOp(maChien, machineSystemId),
    queryFn: async (): Promise<SystemOperation | null> => {
      const ops = await systemOperationService.getSystemOperationsByMaChien(maChien);
      const match = ops.find((op) => op.machineSystemId === machineSystemId);
      return match ?? null;
    },
    enabled: !!maChien && !!machineSystemId,
  });

export const useFinishedProductByBatchAndFryer = (maChien: string, machineSystemId: string) =>
  useQuery({
    queryKey: productionEntryKeys.finishedProduct(maChien, machineSystemId),
    queryFn: async (): Promise<FinishedProduct | null> => {
      const result = await finishedProductService.getAllFinishedProducts(1, 200, machineSystemId);
      const match = result.data.find((fp) => fp.maChien === maChien);
      return match ?? null;
    },
    enabled: !!maChien && !!machineSystemId,
  });

export const useUpdateSystemOperationEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SystemOperation> }) =>
      systemOperationService.updateSystemOperation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productionEntryKeys.all });
    },
  });
};

export const useUpdateFinishedProductEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FinishedProduct> }) =>
      finishedProductService.updateFinishedProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productionEntryKeys.all });
    },
  });
};
