import { useQuery } from '@tanstack/react-query';
import supplyRequestService from '../services/supplyRequestService';

export const supplyRequestKeys = {
  all: ['supply-requests'] as const,
  lists: () => [...supplyRequestKeys.all, 'list'] as const,
  list: (page: number, limit: number, search?: string) =>
    [...supplyRequestKeys.lists(), { page, limit, search }] as const,
  detail: (id: string) => [...supplyRequestKeys.all, 'detail', id] as const,
};

export const useSupplyRequests = (
  page: number = 1,
  limit: number = 10,
  search?: string
) => {
  return useQuery({
    queryKey: supplyRequestKeys.list(page, limit, search),
    queryFn: async () => {
      const response = await supplyRequestService.getAllSupplyRequests(
        page,
        limit,
        search
      );
      return response;
    },
  });
};
