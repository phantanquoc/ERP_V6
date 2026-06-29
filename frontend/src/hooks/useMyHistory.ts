import { useQuery } from '@tanstack/react-query';
import { fetchMyHistory, fetchUserHistory, MyHistoryParams, HistoryResult } from '../services/myHistoryService';

export const myHistoryKeys = {
  all: ['my-history'] as const,
  lists: () => [...myHistoryKeys.all, 'list'] as const,
  list: (params: MyHistoryParams) => [...myHistoryKeys.lists(), params] as const,
};

export function useMyHistory(params: MyHistoryParams = {}) {
  return useQuery<HistoryResult>({
    queryKey: myHistoryKeys.list(params),
    queryFn: () => fetchMyHistory(params),
    staleTime: 60_000, // 1 minute
  });
}

export function useUserHistory(userId: string, params: MyHistoryParams = {}) {
  return useQuery<HistoryResult>({
    queryKey: [...myHistoryKeys.list(params), 'user', userId],
    queryFn: () => fetchUserHistory(userId, params),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
}
