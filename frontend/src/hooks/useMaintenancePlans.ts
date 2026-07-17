import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import maintenancePlanService, {
  MaintenancePlanFilters,
  CreateMaintenancePlanRequest,
  UpdateMaintenancePlanRequest,
} from '../services/maintenancePlanService';
import { maintenanceRecordKeys } from './useMaintenanceRecords';

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
    mutationFn: ({ planId, itemId, month, lanThu, ghiChu, nguoiThucHien, nguoiPhu }: { planId: string; itemId: string; month: number; lanThu?: number; ghiChu?: string; nguoiThucHien?: string; nguoiPhu?: string[] }) =>
      maintenancePlanService.toggleMonth(planId, itemId, month, lanThu, ghiChu, nguoiThucHien, nguoiPhu),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: maintenancePlanKeys.lists() });
      const previousData = queryClient.getQueriesData({ queryKey: maintenancePlanKeys.lists() });

      queryClient.setQueriesData(
        { queryKey: maintenancePlanKeys.lists() },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((plan: any) => {
              if (plan.id !== variables.planId) return plan;
              return {
                ...plan,
                items: (plan.items ?? []).map((item: any) => {
                  if (item.id !== variables.itemId) return item;
                  const targetLanThu = variables.lanThu ?? 1;
                  const existingLog = (item.logs ?? []).find(
                    (l: any) => l.thang === variables.month && l.lanThu === targetLanThu,
                  );
                  let newLogs;
                  if (existingLog) {
                    newLogs = (item.logs ?? []).map((l: any) =>
                      l.thang === variables.month && l.lanThu === targetLanThu
                        ? { ...l, hoanThanh: !l.hoanThanh, ngayThucHien: !l.hoanThanh ? new Date().toISOString() : null, nguoiPhu: variables.nguoiPhu ?? l.nguoiPhu ?? [] }
                        : l,
                    );
                  } else {
                    newLogs = [
                      ...(item.logs ?? []),
                      {
                        id: `optimistic-${Date.now()}`,
                        maintenancePlanItemId: variables.itemId,
                        thang: variables.month,
                        lanThu: targetLanThu,
                        hoanThanh: true,
                        ghiChu: variables.ghiChu || null,
                        nguoiThucHien: variables.nguoiThucHien || null,
                        nguoiPhu: variables.nguoiPhu ?? [],
                        ngayThucHien: new Date().toISOString(),
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                      },
                    ];
                  }
                  return { ...item, logs: newLogs };
                }),
              };
            }),
          };
        },
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        for (const [queryKey, data] of context.previousData) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: maintenancePlanKeys.lists() });
      queryClient.invalidateQueries({ queryKey: maintenancePlanKeys.details() });
      queryClient.invalidateQueries({ queryKey: maintenanceRecordKeys.lists() });
    },
  });
};

export const useUpdateLogNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ logId, data }: { logId: string; data: { ghiChu?: string; nguoiThucHien?: string; nguoiPhu?: string[] } }) =>
      maintenancePlanService.updateLogNote(logId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenancePlanKeys.lists() });
      queryClient.invalidateQueries({ queryKey: maintenancePlanKeys.details() });
    },
  });
};

export const useSyncDetails = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => maintenancePlanService.syncDetails(id),
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
