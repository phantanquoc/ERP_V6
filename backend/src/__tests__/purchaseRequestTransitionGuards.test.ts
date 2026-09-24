/**
 * Batch E 7.1 — purchase request transition guards
 * Covers ALLOWED_TRANSITIONS matrix, locked items after approval/completion,
 * submitForApproval wrong-status and TOCTOU.
 */

const mockTxItems = {
  purchaseRequestItem: { createMany: jest.fn().mockResolvedValue({ count: 1 }), deleteMany: jest.fn().mockResolvedValue({}), findMany: jest.fn().mockResolvedValue([]) },
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
  inboundPlan: { findUnique: jest.fn().mockResolvedValue(null), findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'ip-1' }), update: jest.fn() },
  inboundPlanLog: { create: jest.fn().mockResolvedValue({}) },
  purchaseRequestItem_update: jest.fn(),
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
    employee: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    userSecondaryDepartment: { findMany: jest.fn() },
    inboundPlan: { findUnique: jest.fn().mockResolvedValue(null), findFirst: jest.fn().mockResolvedValue(null), create: jest.fn(), update: jest.fn() },
    inboundPlanLog: { create: jest.fn() },
    warehouses: { findUnique: jest.fn().mockResolvedValue(null) },
    warehouseReceipt: { findFirst: jest.fn().mockResolvedValue(null) },
    internationalProduct: { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn() },
    lotProduct: { aggregate: jest.fn().mockResolvedValue({ _sum: { soLuong: 0 } }) },
    department: { findMany: jest.fn().mockResolvedValue([]) },
    replenishmentRequest: { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn() },
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
  // Default gate data: valid so downstream Hoan thanh gate passes when not testing gate failures
  (prismaMock.inboundPlan.findUnique as jest.Mock).mockResolvedValue(null);
  (prismaMock.inboundPlan.findFirst as jest.Mock).mockResolvedValue(null);
  if ((mockTx as any).inboundPlan) {
    ((mockTx as any).inboundPlan.findUnique as jest.Mock).mockResolvedValue(null);
    ((mockTx as any).inboundPlan.findFirst as jest.Mock).mockResolvedValue(null);
  }
  (prismaMock.purchaseRequestItem.findMany as jest.Mock).mockResolvedValue([
    { id: 'pri-1', tenHangHoa: 'Xoai', soLuong: 10, giaThucTe: 1000, soLuongThucTe: 10 },
  ] as any);
  mockTxItems.purchaseRequestItem.findMany.mockResolvedValue([
    { id: 'pri-1', tenHangHoa: 'Xoai', giaThucTe: 1000, soLuongThucTe: 10 } as any,
  ] as any);
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
      // Gate for Hoan thanh: DB has giaThucTe + soLuongThucTe == soLuong (no diff, no reason needed)
      const extraForGate = to === 'Hoàn thành' ? { lyDoChenhLech: null, ngayYeuCau: new Date('2026-01-01') } : {};
      (prismaMock.purchaseRequest.findUnique as jest.Mock).mockResolvedValue(prRow(from, extraForGate));
      (prismaMock.purchaseRequest.update as jest.Mock).mockResolvedValue({ id: 'pr-1', trangThai: to });
      if (to === 'Hoàn thành') {
        (prismaMock.inboundPlan.findUnique as jest.Mock).mockResolvedValue(null);
  (prismaMock.inboundPlan.findFirst as jest.Mock).mockResolvedValue(null);
  if ((mockTx as any).inboundPlan) {
    ((mockTx as any).inboundPlan.findUnique as jest.Mock).mockResolvedValue(null);
    ((mockTx as any).inboundPlan.findFirst as jest.Mock).mockResolvedValue(null);
  }
  (prismaMock.purchaseRequestItem.findMany as jest.Mock).mockResolvedValue([
          { id: 'pri-1', tenHangHoa: 'Xoai', soLuong: 10, giaThucTe: 1200, soLuongThucTe: 10 },
        ] as any);
      }
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u-1', role: 'ADMIN' });
      const payload: any = { trangThai: to, __actorUserId: 'u-1' };
      if (to === 'Đã duyệt') { payload.nguoiDuyet = 'Admin'; payload.ngayDuyet = new Date().toISOString(); }
      await expect(purchaseRequestService.updatePurchaseRequest('pr-1', payload)).resolves.toBeDefined();
    }
  });
});

describe('item/pricing lock — Hoàn thành + Đã hủy lock, Đã duyệt is editable', () => {
  it.each(['Hoàn thành', 'Đã hủy'] as const)('rejects items mutation when status is %s', async (status) => {
    (prismaMock.purchaseRequest.findUnique as jest.Mock).mockResolvedValue(prRow(status));
    await expect(
      purchaseRequestService.updatePurchaseRequest('pr-1', { items: [{ phanLoai: 'Nguyên liệu', tenHangHoa: 'X', soLuong: 1, donViTinh: 'Kg' }] } as any)
    ).rejects.toMatchObject({ name: 'ValidationError' });
  });

  it('rejects pricing field mutation when status is Hoàn thành', async () => {
    (prismaMock.purchaseRequest.findUnique as jest.Mock).mockResolvedValue(prRow('Hoàn thành'));
    await expect(
      purchaseRequestService.updatePurchaseRequest('pr-1', { giaDuKien: 999 } as any)
    ).rejects.toMatchObject({ name: 'ValidationError' });
  });

  it('rejects pricing/schedule mutation when status is Đã hủy', async () => {
    (prismaMock.purchaseRequest.findUnique as jest.Mock).mockResolvedValue(prRow('Đã hủy'));
    await expect(
      purchaseRequestService.updatePurchaseRequest('pr-1', { giaDuKien: 999 } as any)
    ).rejects.toMatchObject({ name: 'ValidationError' });
  });

  it('allows items + pricing mutation when status is Đã duyệt (post-approval correction)', async () => {
    (prismaMock.purchaseRequest.findUnique as jest.Mock).mockResolvedValue(prRow('Đã duyệt'));
    await expect(
      purchaseRequestService.updatePurchaseRequest('pr-1', {
        items: [{ id: 'pri-1', phanLoai: 'Nguyên liệu', tenHangHoa: 'Xoai', soLuong: 10, donViTinh: 'Kg', giaDuKien: 1200, nhaCungCapId: 'sup-1' }],
      } as any)
    ).resolves.toBeDefined();
  });

  it('preserves confirmed giaThucTe across an item re-write after Đã duyệt', async () => {
    (prismaMock.purchaseRequest.findUnique as jest.Mock).mockResolvedValue(
      prRow('Đã duyệt', { items: [{ id: 'pri-1', nhaCungCapId: 'sup-1', giaDuKien: 1000, giaThucTe: 9000, soLuong: 10, phanLoai: 'Nguyên liệu', tenHangHoa: 'Xoai', donViTinh: 'Kg', supplier: { id: 'sup-1' } }] } as any)
    );
    mockTxItems.purchaseRequestItem.findMany.mockResolvedValue([{ id: 'pri-1', tenHangHoa: 'Xoai', giaThucTe: 9000, soLuongThucTe: 10 }] as any);
    await purchaseRequestService.updatePurchaseRequest('pr-1', {
      items: [{ id: 'pri-1', phanLoai: 'Nguyên liệu', tenHangHoa: 'Xoai', soLuong: 10, donViTinh: 'Kg', giaDuKien: 1200, nhaCungCapId: 'sup-1' }],
    } as any);
    const created = (mockTxItems.purchaseRequestItem.createMany as jest.Mock).mock.calls[0][0].data;
    expect(created[0]).toMatchObject({ giaThucTe: 9000 });
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

describe('Hoàn thành gate — giaThucTe>0 + soLuongThucTe>0 + lyDoChenhLech when TT != KH', () => {
  function gateRow(extra: Record<string, unknown> = {}) {
    return prRow('Đã duyệt', { lyDoChenhLech: null, ngayYeuCau: new Date('2026-01-01'), ...extra });
  }

  it('blocks Hoàn thành when giaThucTe is missing/zero', async () => {
    (prismaMock.purchaseRequest.findUnique as jest.Mock).mockResolvedValue(gateRow());
    (prismaMock.inboundPlan.findUnique as jest.Mock).mockResolvedValue(null);
  (prismaMock.inboundPlan.findFirst as jest.Mock).mockResolvedValue(null);
  if ((mockTx as any).inboundPlan) {
    ((mockTx as any).inboundPlan.findUnique as jest.Mock).mockResolvedValue(null);
    ((mockTx as any).inboundPlan.findFirst as jest.Mock).mockResolvedValue(null);
  }
  (prismaMock.purchaseRequestItem.findMany as jest.Mock).mockResolvedValue([
      { id: 'pri-1', tenHangHoa: 'Xoai', soLuong: 10, giaThucTe: null, soLuongThucTe: 10 },
    ] as any);
    (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u-1', role: 'ADMIN' });
    await expect(
      purchaseRequestService.updatePurchaseRequest('pr-1', { trangThai: 'Hoàn thành', __actorUserId: 'u-1' } as any)
    ).rejects.toMatchObject({ name: 'ValidationError' });
  });

  it('blocks Hoàn thành when soLuongThucTe is missing/zero', async () => {
    (prismaMock.purchaseRequest.findUnique as jest.Mock).mockResolvedValue(gateRow());
    (prismaMock.inboundPlan.findUnique as jest.Mock).mockResolvedValue(null);
  (prismaMock.inboundPlan.findFirst as jest.Mock).mockResolvedValue(null);
  if ((mockTx as any).inboundPlan) {
    ((mockTx as any).inboundPlan.findUnique as jest.Mock).mockResolvedValue(null);
    ((mockTx as any).inboundPlan.findFirst as jest.Mock).mockResolvedValue(null);
  }
  (prismaMock.purchaseRequestItem.findMany as jest.Mock).mockResolvedValue([
      { id: 'pri-1', tenHangHoa: 'Xoai', soLuong: 10, giaThucTe: 1000, soLuongThucTe: null },
    ] as any);
    (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u-1', role: 'ADMIN' });
    await expect(
      purchaseRequestService.updatePurchaseRequest('pr-1', { trangThai: 'Hoàn thành', __actorUserId: 'u-1' } as any)
    ).rejects.toMatchObject({ name: 'ValidationError' });
  });

  it('blocks Hoàn thành when TT != KH and lyDoChenhLech is missing (submitted and stored both empty)', async () => {
    (prismaMock.purchaseRequest.findUnique as jest.Mock).mockResolvedValue(gateRow({ lyDoChenhLech: null }));
    (prismaMock.inboundPlan.findUnique as jest.Mock).mockResolvedValue(null);
  (prismaMock.inboundPlan.findFirst as jest.Mock).mockResolvedValue(null);
  if ((mockTx as any).inboundPlan) {
    ((mockTx as any).inboundPlan.findUnique as jest.Mock).mockResolvedValue(null);
    ((mockTx as any).inboundPlan.findFirst as jest.Mock).mockResolvedValue(null);
  }
  (prismaMock.purchaseRequestItem.findMany as jest.Mock).mockResolvedValue([
      { id: 'pri-1', tenHangHoa: 'Xoai', soLuong: 10, giaThucTe: 1000, soLuongThucTe: 8 },
    ] as any);
    (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u-1', role: 'ADMIN' });
    await expect(
      purchaseRequestService.updatePurchaseRequest('pr-1', { trangThai: 'Hoàn thành', __actorUserId: 'u-1' } as any)
    ).rejects.toMatchObject({ name: 'ValidationError' });
  });

  it('blocks Hoàn thành when lyDoChenhLech is whitespace only', async () => {
    (prismaMock.purchaseRequest.findUnique as jest.Mock).mockResolvedValue(gateRow({ lyDoChenhLech: null }));
    (prismaMock.inboundPlan.findUnique as jest.Mock).mockResolvedValue(null);
  (prismaMock.inboundPlan.findFirst as jest.Mock).mockResolvedValue(null);
  if ((mockTx as any).inboundPlan) {
    ((mockTx as any).inboundPlan.findUnique as jest.Mock).mockResolvedValue(null);
    ((mockTx as any).inboundPlan.findFirst as jest.Mock).mockResolvedValue(null);
  }
  (prismaMock.purchaseRequestItem.findMany as jest.Mock).mockResolvedValue([
      { id: 'pri-1', tenHangHoa: 'Xoai', soLuong: 10, giaThucTe: 1000, soLuongThucTe: 8 },
    ] as any);
    (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u-1', role: 'ADMIN' });
    await expect(
      purchaseRequestService.updatePurchaseRequest('pr-1', { trangThai: 'Hoàn thành', lyDoChenhLech: '   ', __actorUserId: 'u-1' } as any)
    ).rejects.toMatchObject({ name: 'ValidationError' });
  });

  it('allows Hoàn thành with diff when lyDoChenhLech is supplied in payload', async () => {
    (prismaMock.purchaseRequest.findUnique as jest.Mock).mockResolvedValue(gateRow({ lyDoChenhLech: null }));
    (prismaMock.inboundPlan.findUnique as jest.Mock).mockResolvedValue(null);
  (prismaMock.inboundPlan.findFirst as jest.Mock).mockResolvedValue(null);
  if ((mockTx as any).inboundPlan) {
    ((mockTx as any).inboundPlan.findUnique as jest.Mock).mockResolvedValue(null);
    ((mockTx as any).inboundPlan.findFirst as jest.Mock).mockResolvedValue(null);
  }
  (prismaMock.purchaseRequestItem.findMany as jest.Mock).mockResolvedValue([
      { id: 'pri-1', tenHangHoa: 'Xoai', soLuong: 10, giaThucTe: 1000, soLuongThucTe: 8 },
    ] as any);
    (prismaMock.purchaseRequest.update as jest.Mock).mockResolvedValue({ id: 'pr-1', trangThai: 'Hoàn thành' });
    (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u-1', role: 'ADMIN' });
    await expect(
      purchaseRequestService.updatePurchaseRequest('pr-1', { trangThai: 'Hoàn thành', lyDoChenhLech: 'Hao hut van chuyen', __actorUserId: 'u-1' } as any)
    ).resolves.toBeDefined();
  });

  it('allows Hoàn thành with diff when lyDoChenhLech already stored (payload omits field)', async () => {
    (prismaMock.purchaseRequest.findUnique as jest.Mock).mockResolvedValue(gateRow({ lyDoChenhLech: 'Giao thieu do NCC' }));
    (prismaMock.inboundPlan.findUnique as jest.Mock).mockResolvedValue(null);
  (prismaMock.inboundPlan.findFirst as jest.Mock).mockResolvedValue(null);
  if ((mockTx as any).inboundPlan) {
    ((mockTx as any).inboundPlan.findUnique as jest.Mock).mockResolvedValue(null);
    ((mockTx as any).inboundPlan.findFirst as jest.Mock).mockResolvedValue(null);
  }
  (prismaMock.purchaseRequestItem.findMany as jest.Mock).mockResolvedValue([
      { id: 'pri-1', tenHangHoa: 'Xoai', soLuong: 10, giaThucTe: 1000, soLuongThucTe: 12 },
    ] as any);
    (prismaMock.purchaseRequest.update as jest.Mock).mockResolvedValue({ id: 'pr-1', trangThai: 'Hoàn thành' });
    (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u-1', role: 'ADMIN' });
    await expect(
      purchaseRequestService.updatePurchaseRequest('pr-1', { trangThai: 'Hoàn thành', __actorUserId: 'u-1' } as any)
    ).resolves.toBeDefined();
  });

  it('allows Hoàn thành when TT == KH and no lyDo needed', async () => {
    (prismaMock.purchaseRequest.findUnique as jest.Mock).mockResolvedValue(gateRow({ lyDoChenhLech: null }));
    (prismaMock.inboundPlan.findUnique as jest.Mock).mockResolvedValue(null);
  (prismaMock.inboundPlan.findFirst as jest.Mock).mockResolvedValue(null);
  if ((mockTx as any).inboundPlan) {
    ((mockTx as any).inboundPlan.findUnique as jest.Mock).mockResolvedValue(null);
    ((mockTx as any).inboundPlan.findFirst as jest.Mock).mockResolvedValue(null);
  }
  (prismaMock.purchaseRequestItem.findMany as jest.Mock).mockResolvedValue([
      { id: 'pri-1', tenHangHoa: 'Xoai', soLuong: 10, giaThucTe: 1000, soLuongThucTe: 10 },
    ] as any);
    (prismaMock.purchaseRequest.update as jest.Mock).mockResolvedValue({ id: 'pr-1', trangThai: 'Hoàn thành' });
    (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u-1', role: 'ADMIN' });
    await expect(
      purchaseRequestService.updatePurchaseRequest('pr-1', { trangThai: 'Hoàn thành', __actorUserId: 'u-1' } as any)
    ).resolves.toBeDefined();
  });

  it('uses effective items (carried giaThucTe/soLuongThucTe) when payload includes items', async () => {
    (prismaMock.purchaseRequest.findUnique as jest.Mock).mockResolvedValue(gateRow({ lyDoChenhLech: null }));
    (prismaMock.inboundPlan.findUnique as jest.Mock).mockResolvedValue(null);
  (prismaMock.inboundPlan.findFirst as jest.Mock).mockResolvedValue(null);
  if ((mockTx as any).inboundPlan) {
    ((mockTx as any).inboundPlan.findUnique as jest.Mock).mockResolvedValue(null);
    ((mockTx as any).inboundPlan.findFirst as jest.Mock).mockResolvedValue(null);
  }
  (prismaMock.purchaseRequestItem.findMany as jest.Mock).mockResolvedValue([
      { id: 'pri-1', tenHangHoa: 'Xoai', soLuong: 10, giaThucTe: 1000, soLuongThucTe: 10 },
    ] as any);
    mockTxItems.purchaseRequestItem.findMany.mockResolvedValue([
      { id: 'pri-1', tenHangHoa: 'Xoai', giaThucTe: 1000, soLuongThucTe: 10 },
    ] as any);
    (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u-1', role: 'ADMIN' });
    await expect(
      purchaseRequestService.updatePurchaseRequest('pr-1', {
        trangThai: 'Hoàn thành',
        items: [{ id: 'pri-1', phanLoai: 'Nguyên liệu', tenHangHoa: 'Xoai', soLuong: 10, donViTinh: 'Kg', giaDuKien: 1000 }],
        lyDoChenhLech: 'Khong can vi TT==KH carry',
        __actorUserId: 'u-1',
      } as any)
    ).resolves.toBeDefined();
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
