import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import maintenancePlanService, {
  MaintenancePlanFilters,
  CreateMaintenancePlanRequest,
  UpdateMaintenancePlanRequest,
} from '../services/maintenancePlanService';

export const maintenancePlanKeys = {
  all: ['maintenancePlans'] as const,
  lists: () => [...maintenancePlanKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...maintenancePlanKeys.lists(), filters] as const,
  details: () => [...maintenancePlanKeys.all, 'detail'] as const,
  detail: (id: string) => [...maintenancePlanKeys.details(), id] as const,
  generatedCode: () => [...maintenancePlanKeys.all, 'generatedCode'] as const,
};

export const useMaintenancePlans = (filters: MaintenancePlanFilters = {}) =>
  useQuery({
    queryKey: maintenancePlanKeys.list(filters),
    queryFn: () => maintenancePlanService.getAll(filters),
  });

export const useMaintenancePlan = (id: string) =>
  useQuery({
    queryKey: maintenancePlanKeys.detail(id),
    queryFn: () => maintenancePlanService.getById(id),
    enabled: !!id,
  });

export const useGeneratedPlanCode = () =>
  useQuery({
    queryKey: maintenancePlanKeys.generatedCode(),
    queryFn: () => maintenancePlanService.generateCode(),
  });

export const useCreateMaintenancePlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, file }: { data: CreateMaintenancePlanRequest; file?: File }) =>
      maintenancePlanService.create(data, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenancePlanKeys.lists() });
      queryClient.invalidateQueries({ queryKey: maintenancePlanKeys.generatedCode() });
    },
  });
};

export const useUpdateMaintenancePlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, file }: { id: string; data: UpdateMaintenancePlanRequest; file?: File }) =>
      maintenancePlanService.update(id, data, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: maintenancePlanKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: maintenancePlanKeys.lists() });
    },
  });
};

export const useToggleMonth = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, itemId, month, lanThu, ghiChu, nguoiThucHien }: { planId: string; itemId: string; month: number; lanThu?: number; ghiChu?: string; nguoiThucHien?: string }) =>
      maintenancePlanService.toggleMonth(planId, itemId, month, lanThu, ghiChu, nguoiThucHien),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenancePlanKeys.lists() });
      queryClient.invalidateQueries({ queryKey: maintenancePlanKeys.details() });
    },
  });
};

export const useUpdateLogNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ logId, data }: { logId: string; data: { ghiChu?: string; nguoiThucHien?: string } }) =>
      maintenancePlanService.updateLogNote(logId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenancePlanKeys.lists() });
      queryClient.invalidateQueries({ queryKey: maintenancePlanKeys.details() });
    },
  });
};

export const useDeleteMaintenancePlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => maintenancePlanService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenancePlanKeys.lists() });
      queryClient.invalidateQueries({ queryKey: maintenancePlanKeys.generatedCode() });
    },
  });
};
