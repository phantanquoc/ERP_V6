import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { overtimePlanService, OvertimePlanStatus, CreateOvertimePlanData } from '../services/overtimePlanService';

export const overtimePlanKeys = {
  all: ['overtime-plans'] as const,
  lists: () => [...overtimePlanKeys.all, 'list'] as const,
  list: (params: Record<string, any>) => [...overtimePlanKeys.lists(), params] as const,
  myLists: () => [...overtimePlanKeys.all, 'my-list'] as const,
  myList: (params: Record<string, any>) => [...overtimePlanKeys.myLists(), params] as const,
  detail: (id: string) => [...overtimePlanKeys.all, 'detail', id] as const,
};

interface OvertimePlanParams {
  page?: number;
  limit?: number;
}

// Hook to get all overtime plans (admin/manager view)
export function useOvertimePlans(params: OvertimePlanParams = {}, enabled = true) {
  return useQuery({
    queryKey: overtimePlanKeys.list(params),
    queryFn: () => overtimePlanService.getAll(params),
    enabled,
  });
}

// Hook to get current user's overtime plans
export function useMyOvertimePlans(params: OvertimePlanParams = {}, enabled = true) {
  return useQuery({
    queryKey: overtimePlanKeys.myList(params),
    queryFn: () => overtimePlanService.getMyPlans(params),
    enabled,
  });
}

// Hook to create an overtime plan
export function useCreateOvertimePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOvertimePlanData) => overtimePlanService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: overtimePlanKeys.lists() });
      queryClient.invalidateQueries({ queryKey: overtimePlanKeys.myLists() });
    },
  });
}

// Hook to update an overtime plan
export function useUpdateOvertimePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateOvertimePlanData }) =>
      overtimePlanService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: overtimePlanKeys.lists() });
      queryClient.invalidateQueries({ queryKey: overtimePlanKeys.myLists() });
    },
  });
}

// Hook to approve or reject an overtime plan
export function useApprovePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      trangThai,
      lyDoTuChoi,
    }: {
      id: string;
      trangThai: 'DA_DUYET' | 'TU_CHOI';
      lyDoTuChoi?: string;
    }) => overtimePlanService.approvePlan(id, trangThai as OvertimePlanStatus, lyDoTuChoi),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: overtimePlanKeys.lists() });
      queryClient.invalidateQueries({ queryKey: overtimePlanKeys.myLists() });
    },
  });
}

// Hook to delete an overtime plan
export function useDeleteOvertimePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => overtimePlanService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: overtimePlanKeys.lists() });
      queryClient.invalidateQueries({ queryKey: overtimePlanKeys.myLists() });
    },
  });
}
