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
  systemOpsByMaChien: (maChien: string) =>
    [...productionEntryKeys.all, 'systemOpsByMaChien', maChien] as const,
};

/**
 * Page size for the board's two list queries. A shift is ~8 batches × ~8 machines,
 * so this is far above any real day — but when a response is truncated the board
 * would silently miss cells, so `warnIfTruncated` surfaces it instead.
 */
const BOARD_PAGE_LIMIT = 500;

function warnIfTruncated(what: string, received: number, pagination: unknown): void {
  const total = (pagination as { total?: number } | undefined)?.total;
  if (typeof total === 'number' && total > received) {
    // eslint-disable-next-line no-console
    console.warn(
      `[useProductionDataEntry] ${what}: nhận ${received}/${total} bản ghi — danh sách bị cắt ở ${BOARD_PAGE_LIMIT}.`,
    );
  }
}

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
      const result = await materialEvaluationService.getAllMaterialEvaluations(1, BOARD_PAGE_LIMIT, {
        ca: selectedShift,
        thoiGianChienFrom: range!.from,
        thoiGianChienTo: range!.to,
      });
      warnIfTruncated('Mã chiên', result.data.length, result.pagination);
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

/**
 * FinishedProduct rows for a production date.
 *
 * Scoped to the whole day rather than the shift: `FinishedProduct` has no shift
 * column, so the server cannot narrow it, and a day-scoped cache is shared across
 * the three shifts instead of being refetched per shift. `shift` participates in
 * the key only so switching shift re-reads the cache coherently.
 */
export const useAllFinishedProducts = (productionDate: string, _shift?: number) => {
  const range = productionDate ? getLocalDayRange(productionDate) : null;

  return useQuery({
    queryKey: productionEntryKeys.finishedProducts(productionDate),
    queryFn: async (): Promise<FinishedProduct[]> => {
      const result = await finishedProductService.getAllFinishedProducts(1, BOARD_PAGE_LIMIT, undefined, {
        thoiGianChienFrom: range!.from,
        thoiGianChienTo: range!.to,
      });
      warnIfTruncated('Sản lượng', result.data.length, result.pagination);
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

export interface EntryHistoryRow {
  grade: string;
  khoiLuong: number;
  employeeId?: string;
  employeeName?: string;
}

export interface DirtyRecord {
  id?: string;
  data: Partial<FinishedProduct>;
  /** When id is absent, use upsert by (maChien, machineSystemId) */
  upsert?: { maChien: string; machineSystemId: string };
  /** Per-grade attribution rows (only for cells with grade-tab changes, not waste-only) */
  entryHistory?: EntryHistoryRow[];
}

export interface SaveResult {
  cellKey: string;
  ok: boolean;
  error?: string;
}

export interface BatchUpdateInput {
  records: DirtyRecord[];
  /** Called as each cell settles, so the UI can show progress on a long save. */
  onProgress?: (done: number, total: number) => void;
}

export const useBatchUpdateFinishedProducts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ records, onProgress }: BatchUpdateInput): Promise<SaveResult[]> => {
      const total = records.length;
      let done = 0;
      // Concurrent, not sequential: a full shift can be ~64 dirty cells, and one
      // round-trip after another made the worker wait for the sum of them.
      // allSettled keeps the per-cell outcome the partial-failure report needs.
      const settled = await Promise.allSettled(
        records.map(async (rec): Promise<SaveResult> => {
          const cellKey = rec.upsert
            ? `${rec.upsert.maChien}|${rec.upsert.machineSystemId}`
            : rec.id ?? 'unknown';
          try {
            if (rec.upsert) {
              // Upsert path: handles both new records and sends entry history
              await finishedProductService.upsertByBatchMachine({
                ...rec.data,
                maChien: rec.upsert.maChien,
                machineSystemId: rec.upsert.machineSystemId,
                entryHistory: rec.entryHistory,
              });
            } else if (rec.id) {
              // Existing record by id: PATCH the record
              await finishedProductService.updateFinishedProduct(rec.id, rec.data);
            }
            return { cellKey, ok: true };
          } catch (err: any) {
            return { cellKey, ok: false, error: err?.message ?? 'Lỗi không xác định' };
          } finally {
            done += 1;
            onProgress?.(done, total);
          }
        }),
      );

      return settled.map((outcome, idx) => {
        if (outcome.status === 'fulfilled') return outcome.value;
        const rec = records[idx];
        const cellKey = rec?.upsert
          ? `${rec.upsert.maChien}|${rec.upsert.machineSystemId}`
          : rec?.id ?? 'unknown';
        return { cellKey, ok: false, error: outcome.reason?.message ?? 'Lỗi không xác định' };
      });
    },
    onSuccess: () => {
      // Only the finished-product lists this board reads. Invalidating the whole
      // materialEvaluations namespace refetched every MaterialEvaluation screen and
      // re-ran the board's baseline effect for no reason.
      queryClient.invalidateQueries({
        queryKey: [...productionEntryKeys.all, 'finishedProducts'],
      });
    },
  });
};

// ─── Legacy hooks (kept for backward compat if needed elsewhere) ─────────────

/**
 * All SystemOperation rows seeded for a fry batch (one per machine that was active
 * at batch creation). Drives the operation-entry machine picker: machines come from
 * the seeded rows — NOT from the current active-machine list — so a machine that went
 * into maintenance mid-shift still shows up with its data, and a machine reactivated
 * after creation never appears with no row to fill.
 *
 * Callers that need one machine's row should pick it out of this result rather than
 * issuing a second query against the same endpoint.
 */
export const useSystemOperationsByMaChien = (maChien: string) =>
  useQuery({
    queryKey: productionEntryKeys.systemOpsByMaChien(maChien),
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
      // Only the operation rows, not every MaterialEvaluation screen.
      queryClient.invalidateQueries({
        queryKey: [...productionEntryKeys.all, 'systemOpsByMaChien'],
      });
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
