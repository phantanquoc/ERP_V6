import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import payrollService, { PayrollItem, PayrollDetail } from '../services/payrollService';

// Query keys for cache management
export const payrollKeys = {
  all: ['payroll'] as const,
  lists: () => [...payrollKeys.all, 'list'] as const,
  list: (month: number, year: number) => [...payrollKeys.lists(), { month, year }] as const,
  details: () => [...payrollKeys.all, 'detail'] as const,
  detail: (id: string) => [...payrollKeys.details(), id] as const,
};

// Hook to get payroll by month and year
export const usePayrollByMonthYear = (month: number, year: number) => {
  return useQuery({
    queryKey: payrollKeys.list(month, year),
    queryFn: () => payrollService.getPayrollByMonthYear(month, year),
  });
};

// Hook to get payroll detail
export const usePayrollDetail = (id: string) => {
  return useQuery({
    queryKey: payrollKeys.detail(id),
    queryFn: () => payrollService.getPayrollDetail(id),
    enabled: !!id,
  });
};

// Hook to create or update payroll
export const useCreateOrUpdatePayroll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ employeeId, month, year, data }: { employeeId: string; month: number; year: number; data: any }) =>
      payrollService.createOrUpdatePayroll(employeeId, month, year, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.lists() });
    },
  });
};

// Hook to update payroll
export const useUpdatePayroll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      payrollService.updatePayroll(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: payrollKeys.lists() });
    },
  });
};

