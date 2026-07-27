/**
 * TanStack-Query hooks for the 5 production entities:
 * SystemOperation, FinishedProduct (list/detail), QualityEvaluation, MaterialEvaluation, ProductionReport
 *
 * Components should use these hooks instead of calling service methods directly.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import systemOperationService, { SystemOperation } from '../services/systemOperationService';
import qualityEvaluationService from '../services/qualityEvaluationService';
import materialEvaluationService from '../services/materialEvaluationService';
import productionReportService from '../services/productionReportService';
import finishedProductService from '../services/finishedProductService';

// ─── Query key factories ──────────────────────────────────────────────────────

export const systemOperationKeys = {
  all: ['systemOperations'] as const,
  lists: () => [...systemOperationKeys.all, 'list'] as const,
  list: (filters: Record<string, any> = {}) => [...systemOperationKeys.lists(), filters] as const,
  details: () => [...systemOperationKeys.all, 'detail'] as const,
  detail: (id: string) => [...systemOperationKeys.details(), id] as const,
};

export const qualityEvaluationKeys = {
  all: ['qualityEvaluations'] as const,
  lists: () => [...qualityEvaluationKeys.all, 'list'] as const,
  list: (filters: Record<string, any> = {}) => [...qualityEvaluationKeys.lists(), filters] as const,
  details: () => [...qualityEvaluationKeys.all, 'detail'] as const,
  detail: (id: string) => [...qualityEvaluationKeys.details(), id] as const,
};

export const materialEvaluationKeys = {
  all: ['materialEvaluations'] as const,
  lists: () => [...materialEvaluationKeys.all, 'list'] as const,
  list: (filters: Record<string, any> = {}) => [...materialEvaluationKeys.lists(), filters] as const,
  details: () => [...materialEvaluationKeys.all, 'detail'] as const,
  detail: (id: string) => [...materialEvaluationKeys.details(), id] as const,
  today: (operator: string, date: string) =>
    [...materialEvaluationKeys.all, 'today', operator, date] as const,
};

export const productionReportKeys = {
  all: ['productionReports'] as const,
  lists: () => [...productionReportKeys.all, 'list'] as const,
  list: (filters: Record<string, any> = {}) => [...productionReportKeys.lists(), filters] as const,
  details: () => [...productionReportKeys.all, 'detail'] as const,
  detail: (id: string) => [...productionReportKeys.details(), id] as const,
};

// Re-export finishedProductKeys from useFinishedProducts for convenience
export { finishedProductKeys } from './useFinishedProducts';

// ─── SystemOperation hooks ────────────────────────────────────────────────────

export const useSystemOperations = (page = 1, limit = 10, machineSystemId?: string) =>
  useQuery({
    queryKey: systemOperationKeys.list({ page, limit, machineSystemId }),
    queryFn: () => systemOperationService.getAllSystemOperations(page, limit, machineSystemId),
  });

export const useSystemOperation = (id: string) =>
  useQuery({
    queryKey: systemOperationKeys.detail(id),
    queryFn: () => systemOperationService.getSystemOperationById(id),
    enabled: !!id,
  });

export const useCreateSystemOperation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SystemOperation>) => systemOperationService.createSystemOperation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemOperationKeys.lists() });
    },
  });
};

export const useUpdateSystemOperation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SystemOperation> }) =>
      systemOperationService.updateSystemOperation(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: systemOperationKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: systemOperationKeys.lists() });
    },
  });
};

export const useDeleteSystemOperation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => systemOperationService.deleteSystemOperation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemOperationKeys.lists() });
    },
  });
};

// ─── FinishedProduct hooks ────────────────────────────────────────────────────

export const useFinishedProducts = (page = 1, limit = 10, machineSystemId?: string) =>
  useQuery({
    queryKey: ['finishedProducts', 'list', { page, limit, machineSystemId }] as const,
    queryFn: () => finishedProductService.getAllFinishedProducts(page, limit, machineSystemId),
  });

export const useFinishedProduct = (id: string) =>
  useQuery({
    queryKey: ['finishedProducts', 'detail', id] as const,
    queryFn: () => finishedProductService.getFinishedProductById(id),
    enabled: !!id,
  });

// ─── QualityEvaluation hooks ──────────────────────────────────────────────────

export const useQualityEvaluations = (page = 1, limit = 10, machineSystemId?: string) =>
  useQuery({
    queryKey: qualityEvaluationKeys.list({ page, limit, machineSystemId }),
    queryFn: () => qualityEvaluationService.getAllQualityEvaluations(page, limit, machineSystemId),
  });

export const useQualityEvaluation = (id: string) =>
  useQuery({
    queryKey: qualityEvaluationKeys.detail(id),
    queryFn: () => qualityEvaluationService.getQualityEvaluationById(id),
    enabled: !!id,
  });

export const useCreateQualityEvaluation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, file }: { data: Record<string, any>; file?: File }) =>
      qualityEvaluationService.createQualityEvaluation(data, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qualityEvaluationKeys.lists() });
    },
  });
};

export const useUpdateQualityEvaluation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, file }: { id: string; data: Record<string, any>; file?: File }) =>
      qualityEvaluationService.updateQualityEvaluation(id, data, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: qualityEvaluationKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: qualityEvaluationKeys.lists() });
    },
  });
};

export const useDeleteQualityEvaluation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => qualityEvaluationService.deleteQualityEvaluation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qualityEvaluationKeys.lists() });
    },
  });
};

// ─── MaterialEvaluation hooks ─────────────────────────────────────────────────

export const useMaterialEvaluations = (page = 1, limit = 10) =>
  useQuery({
    queryKey: materialEvaluationKeys.list({ page, limit }),
    queryFn: () => materialEvaluationService.getAllMaterialEvaluations(page, limit),
  });

export const useMaterialEvaluation = (id: string) =>
  useQuery({
    queryKey: materialEvaluationKeys.detail(id),
    queryFn: () => materialEvaluationService.getMaterialEvaluationById(id),
    enabled: !!id,
  });

export const useCreateMaterialEvaluation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, file }: { data: Record<string, any>; file?: File }) =>
      materialEvaluationService.createMaterialEvaluation(data, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materialEvaluationKeys.all });
    },
  });
};

export const useUpdateMaterialEvaluation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, file }: { id: string; data: Record<string, any>; file?: File }) =>
      materialEvaluationService.updateMaterialEvaluation(id, data, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: materialEvaluationKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: materialEvaluationKeys.all });
    },
  });
};

export const useDeleteMaterialEvaluation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => materialEvaluationService.deleteMaterialEvaluation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materialEvaluationKeys.all });
    },
  });
};

// ─── ProductionReport hooks ───────────────────────────────────────────────────

export const useProductionReports = (page = 1, limit = 10) =>
  useQuery({
    queryKey: productionReportKeys.list({ page, limit }),
    queryFn: () => productionReportService.getAll(page, limit),
  });

export const useProductionReport = (id: string) =>
  useQuery({
    queryKey: productionReportKeys.detail(id),
    queryFn: () => productionReportService.getById(id),
    enabled: !!id,
  });

export const useCreateProductionReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, file }: { data: Parameters<typeof productionReportService.create>[0]; file?: File }) =>
      productionReportService.create(data, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productionReportKeys.lists() });
    },
  });
};

export const useUpdateProductionReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, file }: { id: string; data: Parameters<typeof productionReportService.update>[1]; file?: File }) =>
      productionReportService.update(id, data, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: productionReportKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: productionReportKeys.lists() });
    },
  });
};

export const useDeleteProductionReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productionReportService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productionReportKeys.lists() });
    },
  });
};
