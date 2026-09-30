import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import repairRequestService, {
  type CreateMaterialNeedRequest,
  type UpdateMaterialNeedRequest,
} from '../services/repairRequestService';
import { repairRequestKeys } from './useRepairRequests';

export const repairMaterialNeedKeys = {
  all: ['repairRequests'] as const,
  list: (repairId: number | string) => repairRequestKeys.materialNeeds(repairId),
};

export const useRepairMaterialNeeds = (repairId: number | string | null | undefined) =>
  useQuery({
    queryKey: repairMaterialNeedKeys.list(repairId as number | string),
    queryFn: () => repairRequestService.listMaterialNeeds(repairId!),
    enabled: !!repairId,
  });

export const useCreateMaterialNeed = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ repairId, payload }: { repairId: number | string; payload: CreateMaterialNeedRequest }) =>
      repairRequestService.createMaterialNeed(repairId, payload),
    onSuccess: (_, { repairId }) => {
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.detail(repairId) });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.materialNeeds(repairId) });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.all });
    },
  });
};

export const useUpdateMaterialNeed = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      repairId,
      needId,
      payload,
    }: {
      repairId: number | string;
      needId: string;
      payload: UpdateMaterialNeedRequest;
    }) => repairRequestService.updateMaterialNeed(repairId, needId, payload),
    onSuccess: (_, { repairId }) => {
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.detail(repairId) });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.materialNeeds(repairId) });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.all });
    },
  });
};

export const useDeleteMaterialNeed = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ repairId, needId }: { repairId: number | string; needId: string }) =>
      repairRequestService.deleteMaterialNeed(repairId, needId),
    onSuccess: (_, { repairId }) => {
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.detail(repairId) });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.materialNeeds(repairId) });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.all });
    },
  });
};

// Compat aliases
export const useUpsertMaterialNeed = useCreateMaterialNeed;
export const useRemoveMaterialNeed = useDeleteMaterialNeed;
