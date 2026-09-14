/**
 * Regression: the hook used to return `.data` (the row array) instead of the full
 * ApiResponse, while ReplenishmentList read `rows.data` as rows — the queue always
 * rendered empty ("Chưa có yêu cầu bổ sung") despite the API returning rows.
 * The hook must return the full `{ data, pagination }` body so the list's
 * `data.data` parse resolves to the rows.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useReplenishmentRequests } from '../../hooks/useReplenishmentRequests';
import { createTestQueryClient } from '../utils';

// ── Mock the service module ────────────────────────────────────────────────────

vi.mock('../../services/replenishmentRequestService', () => {
  const mockService = {
    getAllReplenishmentRequests: vi.fn(),
  };
  return { default: mockService };
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeWrapper() {
  const queryClient = createTestQueryClient();
  return {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useReplenishmentRequests — list parse contract', () => {
  let replenishmentRequestService: { getAllReplenishmentRequests: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    const mod = await import('../../services/replenishmentRequestService');
    replenishmentRequestService = mod.default as any;
    vi.clearAllMocks();
  });

  it('returns the full response body so data.data is the row array', async () => {
    const rows = [{ id: 'ybs-1', maYeuCau: 'YC-BS-2026-001', trangThai: 'Chờ báo giá' }];
    replenishmentRequestService.getAllReplenishmentRequests.mockResolvedValue({
      success: true,
      data: rows,
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useReplenishmentRequests(1, 10), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const body = result.current.data as { data?: unknown[]; pagination?: { total?: number } };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.pagination?.total).toBe(1);
  });
});
