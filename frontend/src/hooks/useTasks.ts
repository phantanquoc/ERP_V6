import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '../services/taskService';

// Query keys for cache management
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  count: () => [...taskKeys.all, 'count'] as const,
};

interface TaskFilters {
  page?: number;
  limit?: number;
  search?: string;
  priority?: string;
  status?: string;
}

// Hook to get all tasks with filters
export const useTasks = (filters: TaskFilters = {}) => {
  const { page = 1, limit = 10, ...rest } = filters;
  
  return useQuery({
    queryKey: taskKeys.list({ page, limit, ...rest }),
    queryFn: () => taskService.getAllTasks({ page, limit, ...rest }),
  });
};

// Hook to get tasks count (for dashboard)
export const useTasksCount = () => {
  return useQuery({
    queryKey: taskKeys.count(),
    queryFn: async () => {
      const response = await taskService.getAllTasks({ page: 1, limit: 1 });
      return response.total;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for count
  });
};

// Hook to get my tasks (for employee dashboard)
export const useMyTasks = (filters: TaskFilters = {}) => {
  const { page = 1, limit = 10, ...rest } = filters;

  return useQuery({
    queryKey: [...taskKeys.lists(), 'my', { page, limit, ...rest }],
    queryFn: () => taskService.getMyTasks({ page, limit, ...rest }),
  });
};

// Hook to get my tasks count (for employee dashboard)
export const useMyTasksCount = () => {
  return useQuery({
    queryKey: [...taskKeys.count(), 'my'],
    queryFn: async () => {
      const response = await taskService.getMyTasks({ page: 1, limit: 1 });
      return response.total;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for count
  });
};

// Hook to get a single task by ID
export const useTask = (id: string) => {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => taskService.getTaskById(id),
    enabled: !!id,
  });
};

// Hook to create task
export const useCreateTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: taskService.createTask.bind(taskService),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.count() });
    },
  });
};

// Hook to update task
export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      taskService.updateTask(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
};

// Hook to delete task
export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: taskService.deleteTask.bind(taskService),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.count() });
    },
  });
};

