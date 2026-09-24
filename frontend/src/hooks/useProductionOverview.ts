import { useQueries } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../services/apiClient';
import machineSystemService from '../services/machineSystemService';
import { orderService } from '../services/orderService';
import finishedProductService from '../services/finishedProductService';
import warehouseService from '../services/warehouseService';
import warehouseReceiptService from '../services/warehouseReceiptService';
import warehouseIssueService from '../services/warehouseIssueService';
import supplyRequestService from '../services/supplyRequestService';

export const productionOverviewKeys = {
  all: ['productionOverview'] as const,
  machines: () => [...productionOverviewKeys.all, 'machines'] as const,
  orders: () => [...productionOverviewKeys.all, 'orders'] as const,
  finished: () => [...productionOverviewKeys.all, 'finished'] as const,
  warehouses: () => [...productionOverviewKeys.all, 'warehouses'] as const,
  receipts: () => [...productionOverviewKeys.all, 'receipts'] as const,
  issues: () => [...productionOverviewKeys.all, 'issues'] as const,
  supplies: () => [...productionOverviewKeys.all, 'supplies'] as const,
};

const STALE_TIME = 60_000;

function retryForOverview(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.statusCode === 401 || error.statusCode === 403) return false;
  }
  return failureCount < 2;
}

/**
 * Overview stats for ProductionManagement.
 *
 * Uses TanStack Query (key factory + enabled + retry + staleTime) instead of
 * the old fetch-all-via-Promise.allSettled pattern. Each resource is a
 * separate query so it can be cached, retried, and invalidated independently.
 *
 * Pagination note: the dashboard only needs aggregates, not the full row set.
 * We request a bounded page (limit 100) and rely on pagination.total for
 * totals where available. Machine/order breakdowns still derive from the page
 * window — for full accuracy the backend should expose a dedicated
 * /production/overview summary endpoint (TODO). This is a strict improvement
 * over limit:10000_fetch-all without changing the API.
 */
export function useProductionOverview() {
  const { user } = useAuth();
  const enabled = !!user;

  const queries = useQueries({
    queries: [
      {
        queryKey: productionOverviewKeys.machines(),
        queryFn: () => machineSystemService.getMachineSystems({ page: 1, limit: 100 }),
        enabled,
        staleTime: STALE_TIME,
        retry: retryForOverview,
        refetchOnWindowFocus: false,
      },
      {
        queryKey: productionOverviewKeys.orders(),
        queryFn: () => orderService.getAllOrders(1, 100),
        enabled,
        staleTime: STALE_TIME,
        retry: retryForOverview,
        refetchOnWindowFocus: false,
      },
      {
        queryKey: productionOverviewKeys.finished(),
        queryFn: () => finishedProductService.getAllFinishedProducts(1, 100),
        enabled,
        staleTime: STALE_TIME,
        retry: retryForOverview,
        refetchOnWindowFocus: false,
      },
      {
        queryKey: productionOverviewKeys.warehouses(),
        queryFn: () => warehouseService.getAllWarehouses(),
        enabled,
        staleTime: STALE_TIME,
        retry: retryForOverview,
        refetchOnWindowFocus: false,
      },
      {
        queryKey: productionOverviewKeys.receipts(),
        queryFn: () => warehouseReceiptService.getAllWarehouseReceipts(),
        enabled,
        staleTime: STALE_TIME,
        retry: retryForOverview,
        refetchOnWindowFocus: false,
      },
      {
        queryKey: productionOverviewKeys.issues(),
        queryFn: () => warehouseIssueService.getAllWarehouseIssues(),
        enabled,
        staleTime: STALE_TIME,
        retry: retryForOverview,
        refetchOnWindowFocus: false,
      },
      {
        queryKey: productionOverviewKeys.supplies(),
        queryFn: () => supplyRequestService.getAllSupplyRequests(1, 100),
        enabled,
        staleTime: STALE_TIME,
        retry: retryForOverview,
        refetchOnWindowFocus: false,
      },
    ],
  });

  const [machineQ, orderQ, finishedQ, warehouseQ, receiptQ, issueQ, supplyQ] = queries;

  const isLoading = queries.some((q) => q.isLoading);
  const isFetching = queries.some((q) => q.isFetching);

  const hasAuthError = queries.some(
    (q) => q.error instanceof ApiError && q.error.statusCode === 401,
  );
  const hasForbidden = queries.some(
    (q) => q.error instanceof ApiError && q.error.statusCode === 403,
  );
  const hasServerError = queries.some(
    (q) => q.error instanceof ApiError && q.error.statusCode >= 500,
  );

  return {
    machineQ,
    orderQ,
    finishedQ,
    warehouseQ,
    receiptQ,
    issueQ,
    supplyQ,
    isLoading,
    isFetching,
    hasAuthError,
    hasForbidden,
    hasServerError,
    errors: queries.map((q) => q.error).filter(Boolean) as unknown[],
  };
}
