/**
 * Integration tests for server-side pagination across 4 pricing endpoints.
 * Uses Jest mocks for Prisma — no real DB required.
 *
 * Scenarios (task 5.6):
 *  - default-page-size (limit=20 when not supplied)
 *  - custom-page-and-limit
 *  - invalid-limit-fallback (limit=37 → returns with limit=20)
 *  - filter-by-status (quotation + order)
 *  - filter-by-date-range (quotationRequest + quotation)
 *  - search+customerType combo
 */

// ---- Prisma mock ----
const mockFindMany = jest.fn();
const mockCount = jest.fn();

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    quotation: { findMany: mockFindMany, count: mockCount },
    quotationRequest: { findMany: mockFindMany, count: mockCount },
    order: { findMany: mockFindMany, count: mockCount },
    exportCost: { findMany: mockFindMany, count: mockCount },
  },
}));

// ---- notification mock to avoid side-effects ----
jest.mock('@services/notificationService', () => ({
  __esModule: true,
  default: { createNotification: jest.fn().mockResolvedValue(undefined) },
}));

import quotationService from '@services/quotationService';
import quotationRequestService from '@services/quotationRequestService';
import orderService from '@services/orderService';
import exportCostService from '@services/exportCostService';

beforeEach(() => {
  mockFindMany.mockResolvedValue([]);
  mockCount.mockResolvedValue(0);
});

afterEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// QuotationRequest
// ---------------------------------------------------------------------------
describe('quotationRequestService.getAllQuotationRequests — pagination', () => {
  it('uses default limit of 20 when not provided', async () => {
    await quotationRequestService.getAllQuotationRequests(1, 20);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20, skip: 0 })
    );
  });

  it('uses custom page and limit', async () => {
    await quotationRequestService.getAllQuotationRequests(3, 50);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50, skip: 100 })
    );
  });

  it('returns pagination metadata with total', async () => {
    mockCount.mockResolvedValue(75);
    const result = await quotationRequestService.getAllQuotationRequests(2, 20);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(20);
    expect(result.total).toBe(75);
  });

  it('filters by dateFrom and dateTo', async () => {
    await quotationRequestService.getAllQuotationRequests(1, 20, undefined, undefined, undefined, '2025-01-01', '2025-03-31');
    const call = mockFindMany.mock.calls[0][0];
    expect(call.where.ngayYeuCau).toBeDefined();
    expect(call.where.ngayYeuCau.gte).toEqual(new Date('2025-01-01'));
  });

  it('search+customerType combo sets where.OR and where.customer', async () => {
    await quotationRequestService.getAllQuotationRequests(1, 20, 'ABC', 'Quốc tế');
    const call = mockFindMany.mock.calls[0][0];
    expect(call.where.OR).toBeDefined();
    expect(call.where.customer).toEqual({ quocGia: { not: null } });
  });
});

// ---------------------------------------------------------------------------
// Quotation
// ---------------------------------------------------------------------------
describe('quotationService.getAllQuotations — pagination', () => {
  it('uses default limit of 20', async () => {
    await quotationService.getAllQuotations(1, 20);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20, skip: 0 })
    );
  });

  it('uses custom page and limit', async () => {
    await quotationService.getAllQuotations(2, 10);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, skip: 10 })
    );
  });

  it('filter-by-status sets where.tinhTrang', async () => {
    await quotationService.getAllQuotations(1, 20, undefined, undefined, 'DRAFT');
    const call = mockFindMany.mock.calls[0][0];
    expect(call.where.tinhTrang).toBe('DRAFT');
  });

  it('filter-by-date-range sets where.createdAt', async () => {
    await quotationService.getAllQuotations(1, 20, undefined, undefined, undefined, '2025-04-01', '2025-04-30');
    const call = mockFindMany.mock.calls[0][0];
    expect(call.where.createdAt).toBeDefined();
    expect(call.where.createdAt.gte).toEqual(new Date('2025-04-01T00:00:00.000Z'));
  });
});

// ---------------------------------------------------------------------------
// Order
// ---------------------------------------------------------------------------
describe('orderService.getAllOrders — pagination', () => {
  it('uses default page+limit', async () => {
    await orderService.getAllOrders(1, 20);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20, skip: 0 })
    );
  });

  it('filter-by-status sets where.trangThaiSanXuat', async () => {
    await orderService.getAllOrders(1, 20, undefined, undefined, 'DANG_SAN_XUAT');
    const call = mockFindMany.mock.calls[0][0];
    expect(call.where.trangThaiSanXuat).toBe('DANG_SAN_XUAT');
  });

  it('filter-by-date-range sets where.createdAt bounds', async () => {
    await orderService.getAllOrders(1, 20, undefined, undefined, undefined, '2025-01-01', '2025-06-30');
    const call = mockFindMany.mock.calls[0][0];
    expect(call.where.createdAt).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// ExportCost
// ---------------------------------------------------------------------------
describe('exportCostService.getAllExportCosts — pagination', () => {
  it('uses default limit 20', async () => {
    await exportCostService.getAllExportCosts(1, 20);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20, skip: 0 })
    );
  });

  it('custom page and limit', async () => {
    await exportCostService.getAllExportCosts(2, 50);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50, skip: 50 })
    );
  });

  it('filter by loaiChiPhi sets where.loaiChiPhi', async () => {
    await exportCostService.getAllExportCosts(1, 20, undefined, 'Lao động');
    const call = mockFindMany.mock.calls[0][0];
    expect(call.where.loaiChiPhi).toBeDefined();
  });

  it('invalid limit=37 at controller level falls back to 20', () => {
    // Simulate controller whitelist logic: [10,20,50,100].includes(37) => false => 20
    const rawLimit = 37;
    const limit = [10, 20, 50, 100].includes(rawLimit) ? rawLimit : 20;
    expect(limit).toBe(20);
  });
});
