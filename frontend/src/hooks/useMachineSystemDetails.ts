import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import machineSystemService, {
  CloneMachineSystemRequest,
  CreateMachineSystemDetailRequest,
  CreateMachineSystemRequest,
  MachineStatusLogFilters,
  MachineSystemCategory,
  MachineSystemDetailFilters,
  MachineSystemFilters,
  UpdateMachineStatusRequest,
  UpdateMachineSystemDetailRequest,
  UpdateMachineSystemRequest,
} from '../services/machineSystemService';

export const machineSystemKeys = {
  all: ['machineSystems'] as const,
  lists: () => [...machineSystemKeys.all, 'list'] as const,
  list: (filters: MachineSystemFilters = {}) => [...machineSystemKeys.lists(), filters] as const,
  details: () => [...machineSystemKeys.all, 'detail'] as const,
  detail: (id: string) => [...machineSystemKeys.details(), id] as const,
};

export const machineSystemDetailKeys = {
  all: ['machineSystemDetails'] as const,
  lists: () => [...machineSystemDetailKeys.all, 'list'] as const,
  list: (filters: MachineSystemDetailFilters = {}) => [...machineSystemDetailKeys.lists(), filters] as const,
  details: () => [...machineSystemDetailKeys.all, 'detail'] as const,
  detail: (id: string) => [...machineSystemDetailKeys.details(), id] as const,
};

export const useMachineSystems = (filters: MachineSystemFilters = {}) =>
  useQuery({
    queryKey: machineSystemKeys.list(filters),
    queryFn: () => machineSystemService.getMachineSystems(filters),
  });

const fryerMachineFilters: MachineSystemFilters = {
  page: 1,
  limit: 200,
  hoatDong: true,
  sortBy: 'maHeThong',
  sortOrder: 'asc',
};

const isVacuumFryerMachineSystem = ({ maHeThong }: { maHeThong: string }) => {
  const match = maHeThong.match(/^HT-CCK-(\d+)$/);
  if (!match) return false;

  const machineNumber = Number(match[1]);
  return machineNumber >= 1 && machineNumber <= 8;
};

export const useActiveFryerMachineSystems = () =>
  useQuery({
    queryKey: [...machineSystemKeys.all, 'activeFryerList', fryerMachineFilters] as const,
    queryFn: async () => {
      const response = await machineSystemService.getMachineSystems(fryerMachineFilters);
      const data = [...(response.data ?? [])]
        .filter(isVacuumFryerMachineSystem)
        .filter((machineSystem) => machineSystem.trangThai === undefined || machineSystem.trangThai === 'HOAT_DONG')
        .sort((left, right) =>
          left.maHeThong.localeCompare(right.maHeThong, 'vi-VN', { numeric: true })
        );
      return { ...response, data };
    },
  });

export const useMachineSystem = (id: string) =>
  useQuery({
    queryKey: machineSystemKeys.detail(id),
    queryFn: () => machineSystemService.getMachineSystemById(id),
    enabled: !!id,
  });

export const useCreateMachineSystem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, file }: { data: CreateMachineSystemRequest; file?: File }) =>
      machineSystemService.createMachineSystem(data, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: machineSystemKeys.lists() });
    },
  });
};

export const useUpdateMachineSystem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, file }: { id: string; data: UpdateMachineSystemRequest; file?: File }) =>
      machineSystemService.updateMachineSystem(id, data, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: machineSystemKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: machineSystemKeys.lists() });
      queryClient.invalidateQueries({ queryKey: machineSystemDetailKeys.lists() });
    },
  });
};

export const useDeleteMachineSystem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => machineSystemService.deleteMachineSystem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: machineSystemKeys.lists() });
      queryClient.invalidateQueries({ queryKey: machineSystemDetailKeys.lists() });
    },
  });
};

export const useMachineSystemDetails = (filters: MachineSystemDetailFilters = {}) =>
  useQuery({
    queryKey: machineSystemDetailKeys.list(filters),
    queryFn: () => machineSystemService.getDetails(filters),
  });

export const useMachineSystemDetail = (id: string) =>
  useQuery({
    queryKey: machineSystemDetailKeys.detail(id),
    queryFn: () => machineSystemService.getDetailById(id),
    enabled: !!id,
  });

export const useCreateMachineSystemDetail = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, file }: { data: CreateMachineSystemDetailRequest; file?: File }) =>
      machineSystemService.createDetail(data, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: machineSystemDetailKeys.lists() });
      queryClient.invalidateQueries({ queryKey: machineSystemKeys.lists() });
    },
  });
};

export const useUpdateMachineSystemDetail = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, file }: { id: string; data: UpdateMachineSystemDetailRequest; file?: File }) =>
      machineSystemService.updateDetail(id, data, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: machineSystemDetailKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: machineSystemDetailKeys.lists() });
      queryClient.invalidateQueries({ queryKey: machineSystemKeys.lists() });
    },
  });
};

export const useDeactivateMachineSystemDetail = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => machineSystemService.deactivateDetail(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: machineSystemDetailKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: machineSystemDetailKeys.lists() });
    },
  });
};

export const useDeleteMachineSystemDetail = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => machineSystemService.deleteDetail(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: machineSystemDetailKeys.lists() });
    },
  });
};

export const useNextMachineSystemCode = (loaiHeThong: MachineSystemCategory | undefined) =>
  useQuery({
    queryKey: ['machineSystemNextCode', loaiHeThong],
    queryFn: () => machineSystemService.getNextCode(loaiHeThong!),
    enabled: !!loaiHeThong,
  });

export const useDistinctMachineSystemFields = () =>
  useQuery({
    queryKey: ['machineSystemDistinctFields'],
    queryFn: () => machineSystemService.getDistinctFields(),
  });

export const useNextDetailCode = (loaiChiTiet: string | undefined) =>
  useQuery({
    queryKey: ['machineSystemDetailNextCode', loaiChiTiet],
    queryFn: () => machineSystemService.generateDetailCode(loaiChiTiet!),
    enabled: !!loaiChiTiet,
  });

export const useDetailTree = (machineSystemId: string | undefined) =>
  useQuery({
    queryKey: [...machineSystemDetailKeys.all, 'tree', machineSystemId],
    queryFn: () => machineSystemService.getDetailTree(machineSystemId!),
    enabled: !!machineSystemId,
  });

export const machineStatusLogKeys = {
  all: ['machineStatusLogs'] as const,
  lists: () => [...machineStatusLogKeys.all, 'list'] as const,
  list: (filters: MachineStatusLogFilters = {}) => [...machineStatusLogKeys.lists(), filters] as const,
};

export const useMachineStatusLogs = (filters: MachineStatusLogFilters = {}) =>
  useQuery({
    queryKey: machineStatusLogKeys.list(filters),
    queryFn: () => machineSystemService.getMachineStatusLogs(filters),
  });

export const machineSystemSummaryKeys = {
  all: ['machineSystemSummary'] as const,
  detail: (id: string) => [...machineSystemSummaryKeys.all, id] as const,
};

export const useMachineSystemSummary = (id: string, recentLimit?: number) =>
  useQuery({
    queryKey: [...machineSystemSummaryKeys.detail(id), recentLimit],
    queryFn: () => machineSystemService.getMachineSystemSummary(id, recentLimit),
    enabled: !!id,
  });

export const useCloneMachineSystem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CloneMachineSystemRequest }) =>
      machineSystemService.cloneMachineSystem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: machineSystemKeys.lists() });
    },
  });
};

export const useUpdateMachineStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMachineStatusRequest }) =>
      machineSystemService.updateMachineStatus(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: machineSystemKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: machineStatusLogKeys.lists() });
      queryClient.invalidateQueries({ queryKey: machineSystemSummaryKeys.detail(variables.id) });
    },
  });
};
