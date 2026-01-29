import { useQuery } from '@tanstack/react-query';
import departmentService from '../services/departmentService';

// Query keys for cache management
export const departmentKeys = {
  all: ['departments'] as const,
  lists: () => [...departmentKeys.all, 'list'] as const,
  details: () => [...departmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...departmentKeys.details(), id] as const,
};

// Hook to get all departments
export const useDepartments = () => {
  return useQuery({
    queryKey: departmentKeys.lists(),
    queryFn: () => departmentService.getAllDepartments(),
    // Departments rarely change, cache for longer
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

// Hook to get a single department by ID
export const useDepartment = (id: string) => {
  return useQuery({
    queryKey: departmentKeys.detail(id),
    queryFn: () => departmentService.getDepartmentById(id),
    enabled: !!id,
  });
};

