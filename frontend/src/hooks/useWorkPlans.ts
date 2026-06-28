import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workPlanService, CreateWorkPlanData, UpdateWorkPlanData } from '../services/workPlanService';

export const workPlanKeys = {
  all: ['work-plans'] as const,
  lists: () => [...workPlanKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...workPlanKeys.lists(), params] as const,
  myLists: () => [...workPlanKeys.all, 'my-list'] as const,
  myList: (params: Record<string, unknown>) => [...workPlanKeys.myLists(), params] as const,
  detail: (id: string) => [...workPlanKeys.all, 'detail', id] as const,
};

export interface WorkPlanParams {
  page?: number;
  limit?: number;
  search?: string;
}

// Hook to get all work plans (admin/manager view)
export function useWorkPlans(params: WorkPlanParams = {}, enabled = true) {
  return useQuery({
    queryKey: workPlanKeys.list(params as Record<string, unknown>),
    queryFn: () => workPlanService.getAllWorkPlans(params.page, params.limit, params.search),
    enabled,
  });
}

// Hook to get current user's work plans
export function useMyWorkPlans(params: WorkPlanParams = {}, enabled = true) {
  return useQuery({
    queryKey: workPlanKeys.myList(params as Record<string, unknown>),
    queryFn: () => workPlanService.getMyWorkPlans(params.page, params.limit, params.search),
    enabled,
  });
}

// Hook to create a work plan
export function useCreateWorkPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorkPlanData) => workPlanService.createWorkPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workPlanKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workPlanKeys.myLists() });
    },
  });
}

// Hook to update a work plan
export function useUpdateWorkPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data, files }: { id: string; data: UpdateWorkPlanData; files?: File[] }) =>
      workPlanService.updateWorkPlan(id, data, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workPlanKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workPlanKeys.myLists() });
    },
  });
}

// Hook to delete a work plan
export function useDeleteWorkPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workPlanService.deleteWorkPlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workPlanKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workPlanKeys.myLists() });
    },
  });
}
