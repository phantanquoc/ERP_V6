import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dataEntryPagePositionService from '../services/dataEntryPagePositionService';

export const dataEntryPagePositionKeys = {
  all: ['dataEntryPagePositions'] as const,
  byPage: (pageKey: string) =>
    [...dataEntryPagePositionKeys.all, 'byPage', pageKey] as const,
};

export const useDataEntryPageMappings = (pageKey: string) => {
  return useQuery({
    queryKey: dataEntryPagePositionKeys.byPage(pageKey),
    queryFn: () => dataEntryPagePositionService.listByPage(pageKey),
    enabled: !!pageKey,
    staleTime: 5 * 60 * 1000,
  });
};

export const useAddPageMapping = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pageKey, positionId }: { pageKey: string; positionId: string }) =>
      dataEntryPagePositionService.addMapping(pageKey, positionId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: dataEntryPagePositionKeys.byPage(variables.pageKey),
      });
    },
  });
};

export const useRemovePageMapping = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pageKey, positionId }: { pageKey: string; positionId: string }) =>
      dataEntryPagePositionService.removeMapping(pageKey, positionId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: dataEntryPagePositionKeys.byPage(variables.pageKey),
      });
    },
  });
};
