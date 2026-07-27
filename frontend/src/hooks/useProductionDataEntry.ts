import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import materialEvaluationService, { MaterialEvaluation } from '../services/materialEvaluationService';
import systemOperationService, { SystemOperation } from '../services/systemOperationService';
import finishedProductService, { FinishedProduct } from '../services/finishedProductService';
import { materialEvaluationKeys } from './useProductionEntities';

// ─── Query Key Factories ─────────────────────────────────────────────────────

export const productionEntryKeys = {
  all: materialEvaluationKeys.all,
  batches: (productionDate?: string, shift?: number) =>
    [...productionEntryKeys.all, 'batches', productionDate ?? '', shift ?? 0] as const,
  finishedProducts: (productionDate?: string) =>
    [...productionEntryKeys.all, 'finishedProducts', productionDate ?? ''] as const,
  systemOp: (maChien: string, machineSystemId: string) =>
    [...productionEntryKeys.all, 'systemOp', maChien, machineSystemId] as const,
  finishedProduct: (maChien: string, machineSystemId: string) =>
    [...productionEntryKeys.all, 'finishedProduct', maChien, machineSystemId] as const,
};

// ─── Helpers: compute local day ISO boundaries ──────────────────────────────

/**
 * Given a YYYY-MM-DD date string, returns ISO start/end of that LOCAL day.
 * Handles timezone correctly by constructing Date from local components.
 */
function getLocalDayRange(dateStr: string): { from: string; to: string } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d, 23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

// ─── Hook: list fry-batches (MaterialEvaluation) by date + shift ────────────

export const useFryBatchCodes = (productionDate: string, selectedShift: number) => {
  const range = productionDate ? getLocalDayRange(productionDate) : null;

  return useQuery({
    queryKey: productionEntryKeys.batches(productionDate, selectedShift),
    queryFn: async (): Promise<MaterialEvaluation[]> => {
      const result = await materialEvaluationService.getAllMaterialEvaluations(1, 500, {
        ca: selectedShift,
        thoiGianChienFrom: range!.from,
        thoiGianChienTo: range!.to,
      });
      return result.data;
    },
    enabled: !!productionDate && selectedShift > 0,
  });
};

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

// ─── Hook: load FinishedProducts for a production date ──────────────────────

export const useAllFinishedProducts = (productionDate: string) => {
  const range = productionDate ? getLocalDayRange(productionDate) : null;

  return useQuery({
    queryKey: productionEntryKeys.finishedProducts(productionDate),
    queryFn: async (): Promise<FinishedProduct[]> => {
      const result = await finishedProductService.getAllFinishedProducts(1, 500, undefined, {
        thoiGianChienFrom: range!.from,
        thoiGianChienTo: range!.to,
      });
      return result.data;
    },
    enabled: !!productionDate,
  });
};

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
  id?: string;
  data: Partial<FinishedProduct>;
  /** When id is absent, use upsert by (maChien, machineSystemId) */
  upsert?: { maChien: string; machineSystemId: string };
}

export interface SaveResult {
  cellKey: string;
  ok: boolean;
  error?: string;
}

export const useBatchUpdateFinishedProducts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (records: DirtyRecord[]): Promise<SaveResult[]> => {
      const results: SaveResult[] = [];
      for (const rec of records) {
        const cellKey = rec.upsert
          ? `${rec.upsert.maChien}|${rec.upsert.machineSystemId}`
          : rec.id ?? 'unknown';
        try {
          if (rec.id) {
            await finishedProductService.updateFinishedProduct(rec.id, rec.data);
          } else if (rec.upsert) {
            await finishedProductService.upsertByBatchMachine({
              ...rec.data,
              maChien: rec.upsert.maChien,
              machineSystemId: rec.upsert.machineSystemId,
            });
          }
          results.push({ cellKey, ok: true });
        } catch (err: any) {
          results.push({ cellKey, ok: false, error: err?.message ?? 'Lỗi không xác định' });
        }
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

/**
 * All SystemOperation rows seeded for a fry batch (one per machine that was active
 * at batch creation). Drives the operation-entry machine picker: machines come from
 * the seeded rows — NOT from the current active-machine list — so a machine that went
 * into maintenance mid-shift still shows up with its data, and a machine reactivated
 * after creation never appears with no row to fill.
 */
export const useSystemOperationsByMaChien = (maChien: string) =>
  useQuery({
    queryKey: [...productionEntryKeys.all, 'systemOpsByMaChien', maChien] as const,
    queryFn: (): Promise<SystemOperation[]> =>
      systemOperationService.getSystemOperationsByMaChien(maChien),
    enabled: !!maChien,
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
