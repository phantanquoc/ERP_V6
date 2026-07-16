import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import holidayService, { CreateHolidayData, UpdateHolidayData } from '../services/holidayService';

export const holidayKeys = {
  all: ['holidays'] as const,
  lists: () => [...holidayKeys.all, 'list'] as const,
  list: (year?: number) => [...holidayKeys.lists(), { year }] as const,
};

export const useHolidays = (year?: number) => {
  return useQuery({
    queryKey: holidayKeys.list(year),
    queryFn: () => holidayService.list(year),
    staleTime: 10 * 60 * 1000,
  });
};

export const useCreateHoliday = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateHolidayData) => holidayService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holidayKeys.lists() });
    },
  });
};

export const useUpdateHoliday = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateHolidayData }) =>
      holidayService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holidayKeys.lists() });
    },
  });
};

export const useDeleteHoliday = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => holidayService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holidayKeys.lists() });
    },
  });
};
