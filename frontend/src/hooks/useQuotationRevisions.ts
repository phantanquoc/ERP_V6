import { useQuery } from '@tanstack/react-query';
import { quotationRevisionService } from '../services/quotationRevisionService';

// Structured key factory (task 9.2)
export const quotationRevisionKeys = {
  all: ['quotationRevisions'] as const,
  lists: () => [...quotationRevisionKeys.all, 'list'] as const,
  list: (quotationId: string, page: number, limit: number) =>
    [...quotationRevisionKeys.lists(), { quotationId, page, limit }] as const,
  details: () => [...quotationRevisionKeys.all, 'detail'] as const,
  detail: (quotationId: string, revisionId: string) =>
    [...quotationRevisionKeys.details(), quotationId, revisionId] as const,
};

export const useQuotationRevisions = (quotationId: string, page = 1, limit = 10) => {
  return useQuery({
    queryKey: quotationRevisionKeys.list(quotationId, page, limit),
    queryFn: () => quotationRevisionService.listRevisions(quotationId, page, limit),
    enabled: !!quotationId,
  });
};

export const useQuotationRevision = (quotationId: string, revisionId: string) => {
  return useQuery({
    queryKey: quotationRevisionKeys.detail(quotationId, revisionId),
    queryFn: () => quotationRevisionService.getRevisionById(quotationId, revisionId),
    enabled: !!quotationId && !!revisionId,
  });
};
