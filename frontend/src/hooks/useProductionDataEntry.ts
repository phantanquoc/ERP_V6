import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import materialEvaluationService, { MaterialEvaluation } from '../services/materialEvaluationService';
import systemOperationService, { SystemOperation } from '../services/systemOperationService';
import finishedProductService, { FinishedProduct } from '../services/finishedProductService';

// ─── Query Key Factories ─────────────────────────────────────────────────────

export const productionEntryKeys = {
  all: ['productionEntry'] as const,
  batches: () => [...productionEntryKeys.all, 'batches'] as const,
  systemOp: (maChien: string, machineSystemId: string) =>
    [...productionEntryKeys.all, 'systemOp', maChien, machineSystemId] as const,
  finishedProduct: (maChien: string, machineSystemId: string) =>
    [...productionEntryKeys.all, 'finishedProduct', maChien, machineSystemId] as const,
};

// ─── Hook: list fry-batch codes ──────────────────────────────────────────────

export const useFryBatchCodes = () =>
  useQuery({
    queryKey: productionEntryKeys.batches(),
    queryFn: async (): Promise<MaterialEvaluation[]> => {
      // Fetch all pages by using a large limit
      const result = await materialEvaluationService.getAllMaterialEvaluations(1, 200);
      return result.data;
    },
  });

// ─── Hook: load SystemOperation for (maChien, machineSystemId) ───────────────

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

// ─── Hook: load FinishedProduct for (maChien, machineSystemId) ───────────────

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

// ─── Mutation: update SystemOperation ────────────────────────────────────────

export const useUpdateSystemOperationEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SystemOperation> }) =>
      systemOperationService.updateSystemOperation(id, data),
    onSuccess: (_result, variables) => {
      // Invalidate the specific record query
      queryClient.invalidateQueries({ queryKey: productionEntryKeys.all });
      void variables; // suppress unused
    },
  });
};

// ─── Mutation: update FinishedProduct ────────────────────────────────────────

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
