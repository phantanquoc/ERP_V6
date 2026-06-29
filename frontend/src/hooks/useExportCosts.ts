import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import exportCostService from '../services/exportCostService';

// Query keys for export costs
export const exportCostKeys = {
  all: ['exportCosts'] as const,
  lists: () => [...exportCostKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...exportCostKeys.lists(), filters] as const,
  details: () => [...exportCostKeys.all, 'detail'] as const,
  detail: (id: string) => [...exportCostKeys.details(), id] as const,
};

interface ExportCostFilters {
  page?: number;
  limit?: number;
  search?: string;
  loaiChiPhi?: string;
}

// Hook to get all export costs with server-side pagination and filtering
export const useExportCosts = (filters: ExportCostFilters = {}) => {
  const { page = 1, limit = 20, search, loaiChiPhi } = filters;

  return useQuery({
    queryKey: exportCostKeys.list({ page, limit, search, loaiChiPhi }),
    queryFn: () => exportCostService.getAllExportCosts(page, limit, search, loaiChiPhi),
  });
};

// Hook to create export cost
export const useCreateExportCost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: exportCostService.createExportCost.bind(exportCostService),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exportCostKeys.lists() });
    },
  });
};

// Hook to update export cost
export const useUpdateExportCost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof exportCostService.updateExportCost>[1] }) =>
      exportCostService.updateExportCost(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: exportCostKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: exportCostKeys.lists() });
    },
  });
};

// Hook to delete export cost
export const useDeleteExportCost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => exportCostService.deleteExportCost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exportCostKeys.lists() });
    },
  });
};
