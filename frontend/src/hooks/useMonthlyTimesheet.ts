import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import timesheetService, { UpsertTimesheetCellData, UpsertTimesheetOverrideData } from '../services/timesheetService';

export const timesheetKeys = {
  all: ['timesheet'] as const,
  monthly: () => [...timesheetKeys.all, 'monthly'] as const,
  monthlyGrid: (month: number, year: number, filters?: Record<string, any>) =>
    [...timesheetKeys.monthly(), { month, year, ...filters }] as const,
};

export const useMonthlyTimesheet = (
  month: number,
  year: number,
  filters?: { search?: string; departmentId?: string; positionId?: string }
) => {
  return useQuery({
    queryKey: timesheetKeys.monthlyGrid(month, year, filters),
    queryFn: () => timesheetService.getMonthly(month, year, filters),
    enabled: month >= 1 && month <= 12 && year > 0,
  });
};

export const useUpsertTimesheetCell = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertTimesheetCellData) => timesheetService.upsertCell(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timesheetKeys.monthly() });
    },
  });
};

export const useUpsertTimesheetOverride = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertTimesheetOverrideData) => timesheetService.upsertOverride(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timesheetKeys.monthly() });
    },
  });
};
