/**
 * Batch E — 7.1 supply replenishment routing
 * Verifies: single/batch shortage grouping per phanLoai bucket,
 * ownership = SR.requester (not warehouse keeper), transaction atomicity,
 * one triggeredPurchaseRequestId per bucket (shared), Chờ bổ sung bridge,
 * and rollback on PR creation failure.
 */

const mockTx: any = {
  supplyRequestItem: { update: jest.fn(), findUnique: jest.fn() },
  supplyRequest: { findUnique: jest.fn(), update: jest.fn() },
  purchaseRequest: { create: jest.fn(), findFirst: jest.fn() },
  purchaseRequestItem: { createMany: jest.fn() },
  supplyRequestDecision: { create: jest.fn() },
};

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    supplyRequestItem: { findUnique: jest.fn(), findMany: jest.fn() },
    supplyRequest: { findUnique: jest.fn(), findMany: jest.fn() },
    purchaseRequest: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    employee: { findUnique: jest.fn() },
    warehouses: { findUnique: jest.fn() },
    lot: { findUnique: jest.fn() },
    lotProduct: { findMany: jest.fn(), findUnique: jest.fn() },
    $transaction: jest.fn((fn: any) => fn(mockTx)),
  },
}));

jest.mock('@utils/errors', () => {
  class ValidationError extends Error { statusCode = 400; constructor(m: string) { super(m); this.name = 'ValidationError'; } }
  class NotFoundError extends Error { statusCode = 404; constructor(m: string) { super(m); this.name = 'NotFoundError'; } }
  class ConflictError extends Error { statusCode = 409; constructor(m: string) { super(m); this.name = 'ConflictError'; } }
  return { ValidationError, NotFoundError, ConflictError, AppError: Error };
});

jest.mock('../utils/codeGenerator', () => ({
  nextYearlyCode: jest.fn((_last: string | null, prefix: string) => `${prefix}2026-${String(Math.random()).slice(2, 6)}`),
  yearlyCodeWhere: jest.fn(() => ({ startsWith: 'YC-MH' })),
}));

jest.mock('@services/notificationService', () => ({
  __esModule: true,
  default: { notify: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../services/warehouseIssueService', () => ({
  __esModule: true,
  default: { create: jest.fn().mockResolvedValue({ id: 'issue-1' }) },
}));

jest.mock('../services/warehouseReceiptService', () => ({
  __esModule: true,
  default: { resolveOrCreateLotProduct: jest.fn().mockResolvedValue({ id: 'lp-new', soLuong: 0, maKien: 'K-NEW' }) },
}));

import prisma from '@config/database';
import supplyRequestService from '@services/supplyRequestService';

const prismaMock = prisma as jest.Mocked<typeof prisma>;

function sr(overrides: any = {}) {
  return {
    id: 'sr-1',
    maYeuCau: 'YC-CC2026-001',
    employeeId: 'emp-requester',
    maNhanVien: 'NV-REQ',
    tenNhanVien: 'Nguyen Requester',
    mucDoUuTien: 'Cao',
    trangThai: 'Chưa cung cấp',
    ...overrides,
  };
}

function item(overrides: any = {}) {
  return {
    id: 'item-1',
    supplyRequestId: 'sr-1',
    phanLoai: 'Nguyên liệu',
    tenGoi: 'Xoai tuoi',
    soLuong: 100,
    donViTinh: 'Kg',
    fulfilledQty: 0,
    fulfillmentStatus: null,
    supplyRequest: sr(),
    ...overrides,
  };
}

beforeEach(() => {
  // resetAllMocks clears mockResolvedValueOnce queues between tests (the prisma
  // mock object is created once by the jest.mock factory and reused), while the
  // mockTx defaults below are re-applied for every test.
  jest.resetAllMocks();
  (prismaMock.$transaction as jest.Mock).mockImplementation((fn: any) => fn(mockTx));
  mockTx.purchaseRequest.create.mockImplementation(({ data }: any) =>
    Promise.resolve({ id: `pr-${data.maYeuCau}-${Math.random().toString(36).slice(2, 6)}`, maYeuCau: data.maYeuCau, ...data })
  );
  mockTx.purchaseRequestItem.createMany.mockResolvedValue({ count: 1 });
  mockTx.supplyRequestItem.update.mockResolvedValue({});
  mockTx.supplyRequestDecision.create.mockResolvedValue({});
  mockTx.supplyRequest.findUnique.mockResolvedValue({ trangThai: 'Chưa cung cấp' });
  mockTx.supplyRequest.update.mockResolvedValue({});
});

describe('supplyRequestService.partialFulfill — replenishment routing', () => {
  it('single-line shortage creates one SHORTAGE PR with ownership = SR requester', async () => {
    (prismaMock.supplyRequestItem.findUnique as jest.Mock).mockResolvedValue(item());
    (prismaMock.supplyRequestItem.findMany as jest.Mock).mockResolvedValue([
      { soLuong: 100, fulfilledQty: 40, fulfillmentStatus: 'Đã cấp một phần' },
    ]);

    await supplyRequestService.partialFulfill('item-1', {
      fulfilledQty: 40,
      decidedByEmployeeId: 'emp-warehouse',
      routeShortageToPurchase: true,
    });

    expect(mockTx.purchaseRequest.create).toHaveBeenCalledTimes(1);
    const prData = mockTx.purchaseRequest.create.mock.calls[0][0].data;
    expect(prData.employeeId).toBe('emp-requester');
    expect(prData.maNhanVien).toBe('NV-REQ');
    expect(prData.tenNhanVien).toBe('Nguyen Requester');
    expect(prData.sourceType).toBe('SHORTAGE');
    expect(prData.trangThai).toBe('Chờ báo giá');
    expect(prData.supplyRequestId).toBe('sr-1');
    // decidedBy stays on decision, not on PR
    expect(mockTx.supplyRequestDecision.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ decidedByEmployeeId: 'emp-warehouse' }) })
    );
  });

  it('decisions in same bucket share triggeredPurchaseRequestId; SR bridges to Chờ bổ sung', async () => {
    (prismaMock.supplyRequestItem.findUnique as jest.Mock).mockResolvedValue(item());
    (prismaMock.supplyRequestItem.findMany as jest.Mock).mockResolvedValue([
      { soLuong: 100, fulfilledQty: 40, fulfillmentStatus: 'Đã cấp một phần' },
    ]);
    await supplyRequestService.partialFulfill('item-1', {
      fulfilledQty: 40,
      decidedByEmployeeId: 'emp-warehouse',
    });
    const decisionData = mockTx.supplyRequestDecision.create.mock.calls[0][0].data;
    void (mockTx.purchaseRequest.create.mock.calls[0][0].data as unknown);
    expect(decisionData.triggeredPurchaseRequestId).toBeTruthy();
    expect(mockTx.supplyRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { trangThai: 'Chờ bổ sung' } })
    );
  });

  it('no shortage creates no PR and decision is "Cấp đủ"', async () => {
    (prismaMock.supplyRequestItem.findUnique as jest.Mock).mockResolvedValue(item({ soLuong: 100, fulfilledQty: 0 }));
    (prismaMock.supplyRequestItem.findMany as jest.Mock).mockResolvedValue([
      { soLuong: 100, fulfilledQty: 100, fulfillmentStatus: 'Đã cấp đủ' },
    ]);
    await supplyRequestService.partialFulfill('item-1', {
      fulfilledQty: 100,
      decidedByEmployeeId: 'emp-warehouse',
    });
    expect(mockTx.purchaseRequest.create).not.toHaveBeenCalled();
    expect(mockTx.supplyRequestDecision.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ decision: 'Cấp đủ', triggeredPurchaseRequestId: null }) })
    );
  });

  it('rolls back decisions and fulfilledQty when PR creation throws (transaction atomicity)', async () => {
    (prismaMock.supplyRequestItem.findUnique as jest.Mock).mockResolvedValue(item());
    (prismaMock.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const tx = {
        ...mockTx,
        purchaseRequest: {
          ...mockTx.purchaseRequest,
          create: jest.fn().mockRejectedValue(new Error('DB down')),
        },
      };
      return fn(tx);
    });
    await expect(
      supplyRequestService.partialFulfill('item-1', {
        fulfilledQty: 40,
        decidedByEmployeeId: 'emp-warehouse',
      })
    ).rejects.toThrow('DB down');
  });
});

describe('supplyRequestService.batchFulfill — bucket grouping', () => {
  function batchItems() {
    return [
      item({ id: 'item-a', phanLoai: 'Nguyên liệu', tenGoi: 'Xoai', soLuong: 100, fulfilledQty: 0, supplyRequest: sr() }),
      item({ id: 'item-b', phanLoai: 'Bao bì', tenGoi: 'Thung carton', soLuong: 50, fulfilledQty: 0, supplyRequest: sr() }),
      item({ id: 'item-c', phanLoai: 'Thiết bị', tenGoi: 'Dao cat', soLuong: 10, fulfilledQty: 0, supplyRequest: sr() }),
    ];
  }

  it('two material lines + one equipment line creates exactly two PRs (materials bucket + equipment bucket)', async () => {
    const items = batchItems();
    (prismaMock.supplyRequestItem.findMany as jest.Mock)
      .mockResolvedValueOnce(items) // load for validation
      .mockResolvedValueOnce([]); // siblings recompute after tx
    // lotProduct stock check must pass for empty issue inputs (no warehouse lines)
    (prismaMock.lotProduct.findMany as jest.Mock).mockResolvedValue([]);
    (prismaMock.supplyRequest.findUnique as jest.Mock).mockResolvedValue(sr());

    const result = await supplyRequestService.batchFulfill([
      { itemId: 'item-a', fulfilledQty: 60, decidedByEmployeeId: 'emp-wh' },
      { itemId: 'item-b', fulfilledQty: 20, decidedByEmployeeId: 'emp-wh' },
      { itemId: 'item-c', fulfilledQty: 5, decidedByEmployeeId: 'emp-wh' },
    ]);

    expect(result.success).toBe(true);
    expect(mockTx.purchaseRequest.create).toHaveBeenCalledTimes(2);
    // materials bucket has 2 items, equipment has 1
    const counts = mockTx.purchaseRequestItem.createMany.mock.calls.map((c: any) => c[0].data.length).sort();
    expect(counts).toEqual([1, 2]);
    // all PRs owned by requester
    for (const call of mockTx.purchaseRequest.create.mock.calls) {
      expect(call[0].data.employeeId).toBe('emp-requester');
      expect(call[0].data.sourceType).toBe('SHORTAGE');
    }
  });

  it('lines in same bucket share the same triggeredPurchaseRequestId', async () => {
    const items = batchItems().slice(0, 2); // both MATERIALS
    (prismaMock.supplyRequestItem.findMany as jest.Mock)
      .mockResolvedValueOnce(items)
      .mockResolvedValueOnce([]);
    (prismaMock.lotProduct.findMany as jest.Mock).mockResolvedValue([]);
    (prismaMock.supplyRequest.findUnique as jest.Mock).mockResolvedValue(sr());

    await supplyRequestService.batchFulfill([
      { itemId: 'item-a', fulfilledQty: 60, decidedByEmployeeId: 'emp-wh' },
      { itemId: 'item-b', fulfilledQty: 20, decidedByEmployeeId: 'emp-wh' },
    ]);

    expect(mockTx.purchaseRequest.create).toHaveBeenCalledTimes(1);
    const prId = (await mockTx.purchaseRequest.create.mock.results[0].value).id;
    const decisionCalls = mockTx.supplyRequestDecision.create.mock.calls;
    // both decisions carry the same PR id (one bucket)
    expect(decisionCalls).toHaveLength(2);
    expect(decisionCalls[0][0].data.triggeredPurchaseRequestId).toBe(prId);
    expect(decisionCalls[1][0].data.triggeredPurchaseRequestId).toBe(prId);
  });

  it('no shortage creates no PR', async () => {
    const items = [item({ id: 'item-a', phanLoai: 'Nguyên liệu', tenGoi: 'Xoai', soLuong: 10, fulfilledQty: 0, supplyRequest: sr() })];
    (prismaMock.supplyRequestItem.findMany as jest.Mock)
      .mockResolvedValueOnce(items)
      .mockResolvedValueOnce([{ soLuong: 10, fulfilledQty: 10, fulfillmentStatus: 'Đã cấp đủ' }]);
    (prismaMock.lotProduct.findMany as jest.Mock).mockResolvedValue([]);
    (prismaMock.supplyRequest.findUnique as jest.Mock).mockResolvedValue(sr());

    await supplyRequestService.batchFulfill([
      { itemId: 'item-a', fulfilledQty: 10, decidedByEmployeeId: 'emp-wh' },
    ]);

    expect(mockTx.purchaseRequest.create).not.toHaveBeenCalled();
  });
});
