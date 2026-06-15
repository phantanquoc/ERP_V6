import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import maintenanceRecordService, {
  MaintenanceRecordFilters,
  CreateMaintenanceRecordRequest,
  UpdateMaintenanceRecordRequest,
} from '../services/maintenanceRecordService';

export const maintenanceRecordKeys = {
  all: ['maintenanceRecords'] as const,
  lists: () => [...maintenanceRecordKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...maintenanceRecordKeys.lists(), filters] as const,
  details: () => [...maintenanceRecordKeys.all, 'detail'] as const,
  detail: (id: string) => [...maintenanceRecordKeys.details(), id] as const,
  generatedCode: () => [...maintenanceRecordKeys.all, 'generatedCode'] as const,
};

export const useMaintenanceRecords = (filters: MaintenanceRecordFilters = {}) =>
  useQuery({
    queryKey: maintenanceRecordKeys.list(filters),
    queryFn: () => maintenanceRecordService.getAll(filters),
  });

export const useMaintenanceRecord = (id: string) =>
  useQuery({
    queryKey: maintenanceRecordKeys.detail(id),
    queryFn: () => maintenanceRecordService.getById(id),
    enabled: !!id,
  });

export const useGeneratedRecordCode = () =>
  useQuery({
    queryKey: maintenanceRecordKeys.generatedCode(),
    queryFn: () => maintenanceRecordService.generateCode(),
  });

export const useCreateMaintenanceRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, file }: { data: CreateMaintenanceRecordRequest; file?: File }) =>
      maintenanceRecordService.create(data, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceRecordKeys.lists() });
      queryClient.invalidateQueries({ queryKey: maintenanceRecordKeys.generatedCode() });
    },
  });
};

export const useUpdateMaintenanceRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, file }: { id: string; data: UpdateMaintenanceRecordRequest; file?: File }) =>
      maintenanceRecordService.update(id, data, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: maintenanceRecordKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: maintenanceRecordKeys.lists() });
    },
  });
};

export const useDeleteMaintenanceRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => maintenanceRecordService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceRecordKeys.lists() });
      queryClient.invalidateQueries({ queryKey: maintenanceRecordKeys.generatedCode() });
    },
  });
};
