import { useQuery } from '@tanstack/react-query';
import technicalSummaryService from '../services/technicalSummaryService';

export const technicalSummaryKeys = {
  all: ['technicalSummary'] as const,
  lists: () => [...technicalSummaryKeys.all, 'list'] as const,
  list: () => [...technicalSummaryKeys.lists()] as const,
  details: () => [...technicalSummaryKeys.all, 'detail'] as const,
  detail: (id: string = 'current') => [...technicalSummaryKeys.details(), id] as const,
};

export const useTechnicalSummary = () =>
  useQuery({
    queryKey: technicalSummaryKeys.detail(),
    queryFn: () => technicalSummaryService.getSummary(),
    staleTime: 60_000,
  });
