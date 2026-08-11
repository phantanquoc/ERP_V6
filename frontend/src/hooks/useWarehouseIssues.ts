import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import warehouseIssueService, {
  type WarehouseIssue,
  type CreateWarehouseIssueData,
  type UpdateWarehouseIssueData,
} from '../services/warehouseIssueService';

export const warehouseIssueKeys = {
  all: ['warehouseIssues'] as const,
  lists: () => [...warehouseIssueKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...warehouseIssueKeys.lists(), filters] as const,
  details: () => [...warehouseIssueKeys.all, 'detail'] as const,
  detail: (id: string) => [...warehouseIssueKeys.details(), id] as const,
};

export const useWarehouseIssues = () => {
  return useQuery({
    queryKey: warehouseIssueKeys.lists(),
    queryFn: async () => {
      const response = await warehouseIssueService.getAllWarehouseIssues();
      return response.data as WarehouseIssue[];
    },
  });
};

export const useWarehouseIssue = (id: string) => {
  return useQuery({
    queryKey: warehouseIssueKeys.detail(id),
    queryFn: async () => {
      const response = await warehouseIssueService.getWarehouseIssueById(id);
      return response.data as WarehouseIssue;
    },
    enabled: !!id,
  });
};

export const useCreateWarehouseIssue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWarehouseIssueData) =>
      warehouseIssueService.createWarehouseIssue(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseIssueKeys.lists() });
    },
  });
};

export const useUpdateWarehouseIssue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWarehouseIssueData }) =>
      warehouseIssueService.updateWarehouseIssue(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseIssueKeys.lists() });
    },
  });
};

export const useDeleteWarehouseIssue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => warehouseIssueService.deleteWarehouseIssue(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseIssueKeys.lists() });
    },
  });
};
