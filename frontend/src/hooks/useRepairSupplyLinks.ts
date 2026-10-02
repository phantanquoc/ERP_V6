import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import repairRequestService, { type CreateSupplyLinkRequest } from '../services/repairRequestService';
import { repairRequestKeys } from './useRepairRequests';

export const repairSupplyLinkKeys = {
  all: ['repairRequests'] as const,
  list: (repairId: number | string) => repairRequestKeys.supplyLinks(repairId),
  chain: (repairId: number | string) => repairRequestKeys.supplyChain(repairId),
};

export const useRepairSupplyLinks = (repairId: number | string | null | undefined) =>
  useQuery({
    queryKey: repairSupplyLinkKeys.list(repairId as number | string),
    queryFn: () => repairRequestService.listSupplyLinks(repairId!),
    enabled: !!repairId,
    refetchOnMount: 'always' as const,
    refetchOnWindowFocus: true,
  });

export const useRepairSupplyChain = (repairId: number | string | null | undefined) =>
  useQuery({
    queryKey: repairSupplyLinkKeys.chain(repairId as number | string),
    queryFn: () => repairRequestService.getSupplyChain(repairId!),
    enabled: !!repairId,
    refetchOnMount: 'always' as const,
    refetchOnWindowFocus: true,
  });

export const useLinkSupplyRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ repairId, payload }: { repairId: number | string; payload: CreateSupplyLinkRequest }) =>
      repairRequestService.linkSupplyRequest(repairId, payload),
    onSuccess: (res, { repairId, payload }) => {
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.detail(repairId) });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.supplyLinks(repairId) });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.supplyChain(repairId) });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.all });
      // also invalidate related supplyRequest queries
      queryClient.invalidateQueries({ queryKey: ['supply-requests'] });
      if (payload.supplyRequestId) {
        queryClient.invalidateQueries({ queryKey: ['supply-requests', 'detail', payload.supplyRequestId] });
      }
      // if response contains supplyRequestId fallback
      const linkedId = (res as unknown as { data?: { supplyRequestId?: string } })?.data?.supplyRequestId;
      if (linkedId && linkedId !== payload.supplyRequestId) {
        queryClient.invalidateQueries({ queryKey: ['supply-requests', 'detail', linkedId] });
      }
    },
  });
};

export const useUnlinkSupplyRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ repairId, linkId }: { repairId: number | string; linkId: string }) =>
      repairRequestService.unlinkSupplyRequest(repairId, linkId),
    onSuccess: (_, { repairId }) => {
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.detail(repairId) });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.supplyLinks(repairId) });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.supplyChain(repairId) });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.all });
      queryClient.invalidateQueries({ queryKey: ['supply-requests'] });
    },
  });
};

// Compat aliases per spec
export const useLinkSupply = useLinkSupplyRequest;
export const useUnlinkSupply = useUnlinkSupplyRequest;
