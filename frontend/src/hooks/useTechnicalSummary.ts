import { useQuery } from '@tanstack/react-query';
import technicalSummaryService from '../services/technicalSummaryService';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../services/apiClient';

export const technicalSummaryKeys = {
  all: ['technicalSummary'] as const,
  lists: () => [...technicalSummaryKeys.all, 'list'] as const,
  // list is alias of lists (same key) — kept for factory symmetry; prefer lists() for collection queries
  list: () => [...technicalSummaryKeys.lists()] as const,
  details: () => [...technicalSummaryKeys.all, 'detail'] as const,
  detail: (id: string = 'current') => [...technicalSummaryKeys.details(), id] as const,
};

export const useTechnicalSummary = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: technicalSummaryKeys.detail(),
    queryFn: () => technicalSummaryService.getSummary(),
    staleTime: 60_000,
    enabled: !!user,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.statusCode === 403) return false;
      // ApiError is the only thrown shape with statusCode; unknown errors retry
      const statusCode = (error as ApiError)?.statusCode;
      if (statusCode === 403) return false;
      return failureCount < 2;
    },
  });
};
