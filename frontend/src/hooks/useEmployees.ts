import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import employeeService from '../services/employeeService';

// Query keys for cache management
export const employeeKeys = {
  all: ['employees'] as const,
  lists: () => [...employeeKeys.all, 'list'] as const,
  list: (page: number, limit: number) => [...employeeKeys.lists(), { page, limit }] as const,
  details: () => [...employeeKeys.all, 'detail'] as const,
  detail: (id: string) => [...employeeKeys.details(), id] as const,
  byCode: (code: string) => [...employeeKeys.all, 'code', code] as const,
};

// Hook to get all employees with pagination
export const useEmployees = (page: number = 1, limit: number = 100) => {
  return useQuery({
    queryKey: employeeKeys.list(page, limit),
    queryFn: () => employeeService.getAllEmployees(page, limit),
  });
};

// Hook to get a single employee by ID
export const useEmployee = (id: string) => {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: () => employeeService.getEmployeeById(id),
    enabled: !!id,
  });
};

// Hook to get employee by code
export const useEmployeeByCode = (code: string) => {
  return useQuery({
    queryKey: employeeKeys.byCode(code),
    queryFn: () => employeeService.getEmployeeByCode(code),
    enabled: !!code,
  });
};

// Hook to create employee
export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: employeeService.createEmployee.bind(employeeService),
    onSuccess: () => {
      // Invalidate all employee lists to refetch
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
};

// Hook to update employee
export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      employeeService.updateEmployee(id, data),
    onSuccess: (_, variables) => {
      // Invalidate specific employee and lists
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
};

// Hook to delete employee
export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: employeeService.deleteEmployee.bind(employeeService),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
};

// Hook to generate employee code
export const useGenerateEmployeeCode = () => {
  return useMutation({
    mutationFn: () => employeeService.generateEmployeeCode(),
  });
};

