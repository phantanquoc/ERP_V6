import { useQuery } from '@tanstack/react-query';
import { quotationAgingService } from '../services/quotationService';

export const quotationAgingKeys = {
  all: ['quotationAging'] as const,
  lists: () => [...quotationAgingKeys.all, 'list'] as const,
  list: (threshold: number) => [...quotationAgingKeys.lists(), { threshold }] as const,
};

export const useQuotationAgingWarnings = (threshold = 7, enabled = true) => {
  return useQuery({
    queryKey: quotationAgingKeys.list(threshold),
    queryFn: () => quotationAgingService.getAgingWarnings(threshold),
    enabled,
  });
};
