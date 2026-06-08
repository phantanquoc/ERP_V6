import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import machineService, { Machine, CreateMachineRequest, UpdateMachineRequest, MachineFilters as ServiceMachineFilters } from '../services/machineService';
import machineSystemService from '../services/machineSystemService';

// Query keys for cache management
export const machineKeys = {
  all: ['machines'] as const,
  lists: () => [...machineKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...machineKeys.lists(), filters] as const,
  details: () => [...machineKeys.all, 'detail'] as const,
  detail: (id: string) => [...machineKeys.details(), id] as const,
  summary: (id: string) => [...machineKeys.all, 'summary', id] as const,
  forSystem: (systemId: string) => [...machineKeys.all, 'forSystem', systemId] as const,
};

interface MachineFilters {
  page?: number;
  limit?: number;
  search?: string;
  machineSystemId?: string;
  trangThai?: string;
}

// Hook to get all machines
export const useMachines = (filters: MachineFilters = {}) => {
  const { page = 1, limit = 1000, search, machineSystemId, trangThai } = filters;

  return useQuery({
    queryKey: machineKeys.list({ page, limit, search, machineSystemId, trangThai }),
    queryFn: () => machineService.getAllMachines(page, limit, { search, machineSystemId, trangThai }),
  });
};

// Hook to get machines belonging to a specific system
export const useMachinesForSystem = (systemId: string) => {
  return useQuery({
    queryKey: machineKeys.forSystem(systemId),
    queryFn: async () => {
      const response = await machineSystemService.getMachinesForSystem(systemId);
      return response.data;
    },
    enabled: !!systemId,
  });
};

// Hook to get machine summary (detail + faults + repairs + operations)
export const useMachineSummary = (id: string) => {
  return useQuery({
    queryKey: machineKeys.summary(id),
    queryFn: () => machineService.getMachineSummary(id),
    enabled: !!id,
  });
};

// Hook to get a single machine by ID
export const useMachine = (id: string) => {
  return useQuery({
    queryKey: machineKeys.detail(id),
    queryFn: () => machineService.getMachineById(id),
    enabled: !!id,
  });
};

// Hook to create machine
export const useCreateMachine = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateMachineRequest) => machineService.createMachine(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: machineKeys.lists() });
    },
  });
};

// Hook to update machine
export const useUpdateMachine = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMachineRequest }) => 
      machineService.updateMachine(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: machineKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: machineKeys.lists() });
    },
  });
};

// Hook to delete machine
export const useDeleteMachine = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => machineService.deleteMachine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: machineKeys.lists() });
    },
  });
};

