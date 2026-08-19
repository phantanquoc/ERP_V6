import { useQuery } from '@tanstack/react-query';
import pricingOverviewService, { PricingOverview } from '../services/pricingOverviewService';

export const pricingOverviewKeys = {
  all: ['pricingOverview'] as const,
  overview: (month?: number, year?: number) =>
    [...pricingOverviewKeys.all, 'overview', month ?? null, year ?? null] as const,
};

export function usePricingOverview(month?: number, year?: number) {
  return useQuery<PricingOverview>({
    queryKey: pricingOverviewKeys.overview(month, year),
    queryFn: () => pricingOverviewService.getOverview(month, year),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
