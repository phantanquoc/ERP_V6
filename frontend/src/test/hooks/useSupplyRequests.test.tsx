/**
 * Tests for useSupplyRequests hook.
 *
 * Key contract tested:
 * - Returns paginated supply request data
 * - search param is passed through to the service
 * - pagination metadata (page, limit, total) is preserved
 * - error state is correctly handled
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useSupplyRequests } from '../../hooks/useSupplyRequests';
import { createTestQueryClient } from '../utils';
import type { SupplyRequest } from '../../services/supplyRequestService';

// ── Mock the service module ────────────────────────────────────────────────────

vi.mock('../../services/supplyRequestService', () => {
  const mockService = {
    getAllSupplyRequests: vi.fn(),
  };
  return { default: mockService };
});

// ── Mock data ──────────────────────────────────────────────────────────────────

const mockRequest1: SupplyRequest = {
  id: 'sr-001',
  stt: 1,
  ngayYeuCau: '2026-06-01',
  maYeuCau: 'YC2026-001',
  employeeId: 'emp-001',
  maNhanVien: 'NV001',
  tenNhanVien: 'Nguyễn Văn An',
  boPhan: 'Sản xuất',
  mucDichYeuCau: 'Mua nguyên liệu',
  mucDoUuTien: 'Cao',
  trangThai: 'Chưa cung cấp',
  createdAt: '2026-06-01T08:00:00Z',
  updatedAt: '2026-06-01T08:00:00Z',
  items: [
    {
      id: 'item-001',
      supplyRequestId: 'sr-001',
      phanLoai: 'Nguyên liệu',
      tenGoi: 'Xoài tươi',
      soLuong: 100,
      donViTinh: 'Kg',
      createdAt: '2026-06-01T08:00:00Z',
      updatedAt: '2026-06-01T08:00:00Z',
    },
  ],
};

const mockRequest2: SupplyRequest = {
  id: 'sr-002',
  stt: 2,
  ngayYeuCau: '2026-06-02',
  maYeuCau: 'YC2026-002',
  employeeId: 'emp-002',
  maNhanVien: 'NV002',
  tenNhanVien: 'Trần Thị Bình',
  boPhan: 'Kho',
  mucDichYeuCau: 'Mua thiết bị bảo hộ',
  mucDoUuTien: 'Trung bình',
  trangThai: 'Đang xử lý',
  createdAt: '2026-06-02T09:00:00Z',
  updatedAt: '2026-06-02T09:00:00Z',
  items: [],
};

const paginatedResponse = (data: SupplyRequest[], page = 1, limit = 10) => ({
  success: true,
  data,
  pagination: {
    page,
    limit,
    total: data.length,
    totalPages: Math.ceil(data.length / limit),
  },
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeWrapper() {
  const queryClient = createTestQueryClient();
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useSupplyRequests', () => {
  let supplyRequestService: { getAllSupplyRequests: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    const mod = await import('../../services/supplyRequestService');
    supplyRequestService = mod.default as any;
    vi.clearAllMocks();
  });

  it('fetches the first page of supply requests', async () => {
    supplyRequestService.getAllSupplyRequests.mockResolvedValue(
      paginatedResponse([mockRequest1, mockRequest2])
    );

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useSupplyRequests(1, 10), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data!;
    expect(Array.isArray(data.data)).toBe(true);
    expect((data.data as SupplyRequest[]).length).toBe(2);
    expect(data.pagination!.total).toBe(2);
  });

  it('returns correct supply request fields', async () => {
    supplyRequestService.getAllSupplyRequests.mockResolvedValue(
      paginatedResponse([mockRequest1])
    );

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useSupplyRequests(1, 10), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const first = (result.current.data!.data as SupplyRequest[])[0];

    expect(first).toMatchObject({
      id: 'sr-001',
      maYeuCau: 'YC2026-001',
      boPhan: 'Sản xuất',
      trangThai: 'Chưa cung cấp',
    });
    expect(Array.isArray(first.items)).toBe(true);
    expect(first.items).toHaveLength(1);
  });

  it('passes search param through to the service', async () => {
    supplyRequestService.getAllSupplyRequests.mockResolvedValue(
      paginatedResponse([mockRequest2])
    );

    const { wrapper } = makeWrapper();
    renderHook(() => useSupplyRequests(1, 10, 'Trần'), { wrapper });

    await waitFor(() => {
      expect(supplyRequestService.getAllSupplyRequests).toHaveBeenCalledWith(
        1,
        10,
        'Trần'
      );
    });
  });

  it('returns empty data array when no results match', async () => {
    supplyRequestService.getAllSupplyRequests.mockResolvedValue(
      paginatedResponse([])
    );

    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useSupplyRequests(1, 10, 'khong-co-ket-qua'),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect((result.current.data!.data as SupplyRequest[]).length).toBe(0);
  });

  it('passes page and limit to the service', async () => {
    supplyRequestService.getAllSupplyRequests.mockResolvedValue(
      paginatedResponse([], 2, 5)
    );

    const { wrapper } = makeWrapper();
    renderHook(() => useSupplyRequests(2, 5), { wrapper });

    await waitFor(() => {
      expect(supplyRequestService.getAllSupplyRequests).toHaveBeenCalledWith(
        2,
        5,
        undefined
      );
    });
  });

  it('transitions to error state when the service throws', async () => {
    supplyRequestService.getAllSupplyRequests.mockRejectedValue(
      new Error('Lỗi kết nối')
    );

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useSupplyRequests(1, 10), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe('Lỗi kết nối');
  });

  it('uses different cache keys for different page/search combinations', async () => {
    supplyRequestService.getAllSupplyRequests
      .mockResolvedValueOnce(paginatedResponse([mockRequest1]))
      .mockResolvedValueOnce(paginatedResponse([mockRequest2]));

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result: result1 } = renderHook(() => useSupplyRequests(1, 10), { wrapper });
    const { result: result2 } = renderHook(() => useSupplyRequests(2, 10), { wrapper });

    await waitFor(() => {
      expect(result1.current.isSuccess).toBe(true);
      expect(result2.current.isSuccess).toBe(true);
    });

    // Each query fetched independently
    expect(supplyRequestService.getAllSupplyRequests).toHaveBeenCalledTimes(2);
  });
});
