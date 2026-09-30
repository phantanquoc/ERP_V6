import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import repairRequestService, { AssignAssigneeRequest } from '../services/repairRequestService';
import { repairRequestKeys } from './useRepairRequests';

// Factory for assignee queries — delegates to central repairRequestKeys
export const repairAssigneeKeys = {
  all: ['repairRequests'] as const,
  list: (repairId: number | string) => repairRequestKeys.assignees(repairId),
};

export const useRepairAssignees = (repairId: number | string | null | undefined) =>
  useQuery({
    queryKey: repairAssigneeKeys.list(repairId as number | string),
    queryFn: () => repairRequestService.listAssignees(repairId!),
    enabled: !!repairId,
  });

export const useAssignUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ repairId, payload }: { repairId: number | string; payload: AssignAssigneeRequest }) =>
      repairRequestService.assignUser(repairId, payload),
    onSuccess: (_, { repairId }) => {
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.detail(repairId) });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.assignees(repairId) });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.all });
    },
  });
};

export const useUnassignUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ repairId, assigneeId }: { repairId: number | string; assigneeId: string }) =>
      repairRequestService.unassignUser(repairId, assigneeId),
    onSuccess: (_, { repairId }) => {
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.detail(repairId) });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.assignees(repairId) });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.all });
    },
  });
};
