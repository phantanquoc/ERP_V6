import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import attendanceCodeService, { CreateAttendanceCodeData, UpdateAttendanceCodeData } from '../services/attendanceCodeService';

export const attendanceCodeKeys = {
  all: ['attendanceCodes'] as const,
  lists: () => [...attendanceCodeKeys.all, 'list'] as const,
};

export const useAttendanceCodes = () => {
  return useQuery({
    queryKey: attendanceCodeKeys.lists(),
    queryFn: () => attendanceCodeService.list(),
    staleTime: 30 * 60 * 1000,
  });
};

export const useCreateAttendanceCode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAttendanceCodeData) => attendanceCodeService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceCodeKeys.lists() });
    },
  });
};

export const useUpdateAttendanceCode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAttendanceCodeData }) =>
      attendanceCodeService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceCodeKeys.lists() });
    },
  });
};

export const useDeleteAttendanceCode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => attendanceCodeService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceCodeKeys.lists() });
    },
  });
};
