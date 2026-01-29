import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import attendanceService from '../services/attendanceService';

// Query keys for cache management
export const attendanceKeys = {
  all: ['attendance'] as const,
  lists: () => [...attendanceKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...attendanceKeys.lists(), filters] as const,
  dateRange: (startDate: string, endDate: string) => [...attendanceKeys.lists(), { startDate, endDate }] as const,
  details: () => [...attendanceKeys.all, 'detail'] as const,
  detail: (id: string) => [...attendanceKeys.details(), id] as const,
};

// Hook to get attendance by date range
export const useAttendanceByDateRange = (startDate: string, endDate: string) => {
  return useQuery({
    queryKey: attendanceKeys.dateRange(startDate, endDate),
    queryFn: () => attendanceService.getAttendanceByDateRange(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
};

// Hook to create attendance
export const useCreateAttendance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => attendanceService.createAttendance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.lists() });
    },
  });
};

// Hook to update attendance
export const useUpdateAttendance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => attendanceService.updateAttendance(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.lists() });
    },
  });
};

// Hook to delete attendance
export const useDeleteAttendance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => attendanceService.deleteAttendance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.lists() });
    },
  });
};

