import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import machineService, { Machine, CreateMachineRequest, UpdateMachineRequest } from '../services/machineService';

// Query keys for cache management
export const machineKeys = {
  all: ['machines'] as const,
  lists: () => [...machineKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...machineKeys.lists(), filters] as const,
  details: () => [...machineKeys.all, 'detail'] as const,
  detail: (id: string) => [...machineKeys.details(), id] as const,
};

interface MachineFilters {
  page?: number;
  limit?: number;
}

// Hook to get all machines
export const useMachines = (filters: MachineFilters = {}) => {
  const { page = 1, limit = 1000 } = filters;
  
  return useQuery({
    queryKey: machineKeys.list({ page, limit }),
    queryFn: () => machineService.getAllMachines(page, limit),
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

