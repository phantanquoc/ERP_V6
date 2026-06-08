import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import machineSystemService, {
  CreateMachineSystemDetailRequest,
  CreateMachineSystemRequest,
  MachineSystemCategory,
  MachineSystemDetailFilters,
  MachineSystemFilters,
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
