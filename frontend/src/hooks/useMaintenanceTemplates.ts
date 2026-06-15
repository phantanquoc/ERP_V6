import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import maintenanceTemplateService, {
  MaintenanceTemplateFilters,
  CreateMaintenanceTemplateRequest,
  UpdateMaintenanceTemplateRequest,
} from '../services/maintenanceTemplateService';

export const maintenanceTemplateKeys = {
  all: ['maintenanceTemplates'] as const,
  lists: () => [...maintenanceTemplateKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...maintenanceTemplateKeys.lists(), filters] as const,
  details: () => [...maintenanceTemplateKeys.all, 'detail'] as const,
  detail: (id: string) => [...maintenanceTemplateKeys.details(), id] as const,
};

export const useMaintenanceTemplates = (filters: MaintenanceTemplateFilters = {}) =>
  useQuery({
    queryKey: maintenanceTemplateKeys.list(filters),
    queryFn: () => maintenanceTemplateService.getAll(filters),
  });

export const useCreateMaintenanceTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMaintenanceTemplateRequest) => maintenanceTemplateService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceTemplateKeys.lists() });
    },
  });
};

export const useUpdateMaintenanceTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMaintenanceTemplateRequest }) =>
      maintenanceTemplateService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceTemplateKeys.lists() });
    },
  });
};

export const useDeleteMaintenanceTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => maintenanceTemplateService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceTemplateKeys.lists() });
    },
  });
};
