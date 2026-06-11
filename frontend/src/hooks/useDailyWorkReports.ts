import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dailyWorkReportService, {
  UpdateDailyWorkReportRequest,
} from '../services/dailyWorkReportService';

export const dailyWorkReportKeys = {
  all: ['daily-work-reports'] as const,
  lists: () => [...dailyWorkReportKeys.all, 'list'] as const,
  list: (params: Record<string, any>) => [...dailyWorkReportKeys.lists(), params] as const,
  myLists: () => [...dailyWorkReportKeys.all, 'my-list'] as const,
  myList: (params: Record<string, any>) => [...dailyWorkReportKeys.myLists(), params] as const,
  detail: (id: string) => [...dailyWorkReportKeys.all, 'detail', id] as const,
  submittedCount: () => [...dailyWorkReportKeys.all, 'submitted-count'] as const,
};

interface DailyWorkReportParams {
  page?: number;
  limit?: number;
  status?: string;
}

// Hook to get all reports (admin view)
export function useAllDailyWorkReports(params: DailyWorkReportParams = {}, enabled = true) {
  const { page = 1, limit = 5, status } = params;
  return useQuery({
    queryKey: dailyWorkReportKeys.list({ page, limit, status }),
    queryFn: () =>
      dailyWorkReportService.getAllReports(page, limit, status === 'ALL' ? undefined : status),
    enabled,
  });
}

// Hook to get my reports
export function useMyDailyWorkReports(params: DailyWorkReportParams = {}, enabled = true) {
  const { page = 1, limit = 5 } = params;
  return useQuery({
    queryKey: dailyWorkReportKeys.myList({ page, limit }),
    queryFn: () => dailyWorkReportService.getMyReports(page, limit),
    enabled,
  });
}

// Hook to update a daily work report (used for status transitions)
export function useUpdateDailyWorkReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDailyWorkReportRequest }) =>
      dailyWorkReportService.updateReport(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyWorkReportKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dailyWorkReportKeys.myLists() });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'reportSubmittedCount'] });
    },
  });
}

// Hook to delete a report
export function useDeleteDailyWorkReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => dailyWorkReportService.deleteReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyWorkReportKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dailyWorkReportKeys.myLists() });
    },
  });
}
