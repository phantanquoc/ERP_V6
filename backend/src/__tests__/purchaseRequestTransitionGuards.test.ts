/**
 * Batch E 7.1 — purchase request transition guards
 * Covers ALLOWED_TRANSITIONS matrix, locked items after approval/completion,
 * submitForApproval wrong-status and TOCTOU.
 */

const mockTxItems = {
  purchaseRequestItem: { createMany: jest.fn().mockResolvedValue({ count: 1 }), deleteMany: jest.fn().mockResolvedValue({}) },
  purchaseRequest: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockTx = {
  purchaseRequestItem: mockTxItems.purchaseRequestItem,
  purchaseRequest: mockTxItems.purchaseRequest,
} as any;

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    purchaseRequest: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    purchaseRequestItem: {
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    supplier: { findMany: jest.fn() },
    supplyRequest: { findUnique: jest.fn(), update: jest.fn() },
    employee: { findMany: jest.fn(), findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    userSecondaryDepartment: { findMany: jest.fn() },
    $transaction: jest.fn((fn: any) => fn(mockTx)),
  },
}));

jest.mock('@utils/errors', () => {
  class ValidationError extends Error { statusCode = 400; constructor(m: string) { super(m); this.name = 'ValidationError'; } }
  class NotFoundError extends Error { statusCode = 404; constructor(m: string) { super(m); this.name = 'NotFoundError'; } }
  class ConflictError extends Error { statusCode = 409; constructor(m: string) { super(m); this.name = 'ConflictError'; } }
  class AuthorizationError extends Error { statusCode = 403; constructor(m: string) { super(m); this.name = 'AuthorizationError'; } }
  return { ValidationError, NotFoundError, ConflictError, AuthorizationError, AppError: Error };
});

jest.mock('../utils/codeGenerator', () => ({
  nextYearlyCode: jest.fn(() => 'YC-MH2026-001'),
  yearlyCodeWhere: jest.fn(() => ({ startsWith: 'YC-MH' })),
}));

jest.mock('@services/notificationService', () => ({
  __esModule: true,
  default: { notify: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../services/supplyRequestService', () => ({
  __esModule: true,
  default: { onPurchaseRequestCreated: jest.fn().mockResolvedValue(undefined), onPurchaseRequestApproved: jest.fn().mockResolvedValue(undefined), onPurchaseRequestCompleted: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('@utils/isPricingApprover', () => ({
  isPricingApprover: jest.fn().mockResolvedValue(true),
}));

import prisma from '@config/database';
import purchaseRequestService, { ALLOWED_TRANSITIONS } from '@services/purchaseRequestService';

const prismaMock = prisma as jest.Mocked<typeof prisma>;

function prRow(trangThai: string, extra: Record<string, unknown> = {}) {
  return {
    id: 'pr-1',
    maYeuCau: 'YC-MH2026-001',
    trangThai,
    employeeId: 'emp-req',
    supplyRequestId: null,
    maNhanVien: 'NV-REQ',
    tenNhanVien: 'Nguyen Requester',
    supplyRequest: null,
    items: [
      { id: 'pri-1', nhaCungCapId: 'sup-1', giaDuKien: 1000, soLuong: 10, phanLoai: 'Nguyên liệu', tenHangHoa: 'Xoai', donViTinh: 'Kg', supplier: { id: 'sup-1' } },
    ],
    ...extra,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (prismaMock.$transaction as jest.Mock).mockImplementation((fn: any) => fn(mockTx));
  mockTx.purchaseRequest.findFirst.mockResolvedValue(null);
  mockTx.purchaseRequest.findUnique.mockImplementation(({ where }: any) =>
    Promise.resolve({ id: where.id, maYeuCau: 'YC-MH2026-001', employeeId: 'emp-req', supplyRequestId: null } as any)
  );
  mockTx.purchaseRequest.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'pr-new', ...data } as any));
  mockTx.purchaseRequest.update.mockImplementation(({ where, data }: any) => Promise.resolve({ id: where.id, ...data, employeeId: 'emp-req' } as any));
});

describe('ALLOWED_TRANSITIONS matrix', () => {
  it('exposes the expected allowlist shape', () => {
    expect(ALLOWED_TRANSITIONS['Chờ báo giá']).toEqual(['Chờ duyệt']);
    expect(ALLOWED_TRANSITIONS['Chờ duyệt']).toEqual(expect.arrayContaining(['Đã duyệt', 'Từ chối']));
    expect(ALLOWED_TRANSITIONS['Từ chối']).toEqual([]);
    expect(ALLOWED_TRANSITIONS['Đã duyệt']).toEqual(['Hoàn thành']);
    expect(ALLOWED_TRANSITIONS['Hoàn thành']).toEqual([]);
  });

  it('blocks Chờ báo giá → Đã duyệt via PUT', async () => {
    (prismaMock.purchaseRequest.findUnique as jest.Mock).mockResolvedValue(prRow('Chờ báo giá'));
    (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u-1', role: 'ADMIN' });
    await expect(
      purchaseRequestService.updatePurchaseRequest('pr-1', { trangThai: 'Đã duyệt', nguoiDuyet: 'Admin', ngayDuyet: new Date().toISOString(), __actorUserId: 'u-1' } as any)
    ).rejects.toMatchObject({ name: 'ValidationError' });
  });

  it('blocks Hoàn thành from Chờ báo giá and Chờ duyệt via PUT', async () => {
    for (const from of ['Chờ báo giá', 'Chờ duyệt', 'Từ chối', 'Hoàn thành']) {
      (prismaMock.purchaseRequest.findUnique as jest.Mock).mockResolvedValue(prRow(from));
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u-1', role: 'ADMIN' });
      await expect(
        purchaseRequestService.updatePurchaseRequest('pr-1', { trangThai: 'Hoàn thành', __actorUserId: 'u-1' } as any)
      ).rejects.toMatchObject({ name: 'ValidationError' });
    }
  });

  it('allows Chờ báo giá → Chờ duyệt and Chờ duyệt → Đã duyệt / Từ chối, and Đã duyệt → Hoàn thành', async () => {
    const ok: Array<[string, string]> = [
      ['Chờ báo giá', 'Chờ duyệt'],
      ['Chờ duyệt', 'Đã duyệt'],
      ['Chờ duyệt', 'Từ chối'],
      ['Đã duyệt', 'Hoàn thành'],
    ];
    for (const [from, to] of ok) {
      (prismaMock.purchaseRequest.findUnique as jest.Mock).mockResolvedValue(prRow(from));
      (prismaMock.purchaseRequest.update as jest.Mock).mockResolvedValue({ id: 'pr-1', trangThai: to });
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u-1', role: 'ADMIN' });
      // approval states require actor check; Hoan thanh requires prior Đã duyệt (satisfied)
      const payload: any = { trangThai: to, __actorUserId: 'u-1' };
      if (to === 'Đã duyệt') { payload.nguoiDuyet = 'Admin'; payload.ngayDuyet = new Date().toISOString(); }
      await expect(purchaseRequestService.updatePurchaseRequest('pr-1', payload)).resolves.toBeDefined();
    }
  });
});

describe('locked items after Đã duyệt / Hoàn thành', () => {
  it.each(['Đã duyệt', 'Hoàn thành'] as const)('rejects items mutation when status is %s', async (status) => {
    (prismaMock.purchaseRequest.findUnique as jest.Mock).mockResolvedValue(prRow(status));
    await expect(
      purchaseRequestService.updatePurchaseRequest('pr-1', { items: [{ phanLoai: 'Nguyên liệu', tenHangHoa: 'X', soLuong: 1, donViTinh: 'Kg' }] } as any)
    ).rejects.toMatchObject({ name: 'ValidationError' });
  });

  it.each(['Đã duyệt', 'Hoàn thành'] as const)('rejects pricing field mutation when status is %s', async (status) => {
    (prismaMock.purchaseRequest.findUnique as jest.Mock).mockResolvedValue(prRow(status));
    await expect(
      purchaseRequestService.updatePurchaseRequest('pr-1', { giaDuKien: 999 } as any)
    ).rejects.toMatchObject({ name: 'ValidationError' });
  });

  it('rejects phanLoai/tenHangHoa mutation when already approved', async () => {
    (prismaMock.purchaseRequest.findUnique as jest.Mock).mockResolvedValue(prRow('Đã duyệt'));
    await expect(purchaseRequestService.updatePurchaseRequest('pr-1', { phanLoai: 'Thiết bị' } as any)).rejects.toMatchObject({ name: 'ValidationError' });
  });
});

describe('submitForApproval', () => {
  it('rejects when status is not Chờ báo giá', async () => {
    (prismaMock.purchaseRequest.findUnique as jest.Mock).mockResolvedValue(prRow('Chờ duyệt'));
    await expect(purchaseRequestService.submitForApproval('pr-1')).rejects.toMatchObject({ name: 'ValidationError' });
  });

  it('rejects when an item lacks supplier or giaDuKien', async () => {
    (prismaMock.purchaseRequest.findUnique as jest.Mock).mockResolvedValue(
      prRow('Chờ báo giá', { items: [{ id: 'pri-1', nhaCungCapId: null, giaDuKien: null, soLuong: 10, phanLoai: 'Nguyên liệu', tenHangHoa: 'X', donViTinh: 'Kg', supplier: null }] } as any)
    );
    await expect(purchaseRequestService.submitForApproval('pr-1')).rejects.toMatchObject({ name: 'ValidationError' });
  });

  it('TOCTOU: throws when underlying updateMany affected rows == 0 (concurrent submit won first)', async () => {
    (prismaMock.purchaseRequest.findUnique as jest.Mock)
      .mockResolvedValueOnce(prRow('Chờ báo giá'))
      .mockResolvedValueOnce({ id: 'pr-1', trangThai: 'Chờ duyệt' }); // fresh read after 0 rows
    (prismaMock.purchaseRequest.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    await expect(purchaseRequestService.submitForApproval('pr-1')).rejects.toMatchObject({ name: 'ValidationError' });
  });

  it('succeeds and notifies when every item is priced and supplier present', async () => {
    (prismaMock.purchaseRequest.findUnique as jest.Mock)
      .mockResolvedValueOnce(prRow('Chờ báo giá'))
      .mockResolvedValueOnce({ id: 'pr-1', trangThai: 'Chờ duyệt', maYeuCau: 'YC-MH2026-001', items: [] } as any);
    (prismaMock.purchaseRequest.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    const res = await purchaseRequestService.submitForApproval('pr-1');
    expect(res).toBeDefined();
    expect((prismaMock.purchaseRequest.updateMany as jest.Mock)).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ trangThai: 'Chờ báo giá' }) })
    );
  });
});

describe('deletePurchaseRequest', () => {
  it('blocks deletion of Đã duyệt and Hoàn thành', async () => {
    for (const status of ['Đã duyệt', 'Hoàn thành']) {
      (prismaMock.purchaseRequest.findUnique as jest.Mock).mockResolvedValue(prRow(status));
      await expect(purchaseRequestService.deletePurchaseRequest('pr-1')).rejects.toMatchObject({ name: 'ValidationError' });
    }
  });

  it('allows deletion of Chờ báo giá and Từ chối', async () => {
    for (const status of ['Chờ báo giá', 'Từ chối']) {
      (prismaMock.purchaseRequest.findUnique as jest.Mock).mockResolvedValue(prRow(status));
      (prismaMock.purchaseRequest.delete as jest.Mock).mockResolvedValue({});
      await expect(purchaseRequestService.deletePurchaseRequest('pr-1')).resolves.toBeDefined();
    }
  });
});
