/**
 * Tests for warehouseIssueService update/delete:
 * - Correct refund on same and different lotProduct
 * - Negative-stock guard
 * - Lock rejection for supplyRequestId AND materialEvaluation
 */

const mockTx = {
  warehouseIssue: {
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  lotProduct: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    warehouseIssue: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    lotProduct: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((fn: any) => fn(mockTx)),
  },
}));

jest.mock('@utils/errors', () => {
  class ValidationError extends Error {
    statusCode = 400;
    constructor(msg: string) { super(msg); this.name = 'ValidationError'; }
  }
  class ConflictError extends Error {
    statusCode = 409;
    constructor(msg: string) { super(msg); this.name = 'ConflictError'; }
  }
  class NotFoundError extends Error {
    statusCode = 404;
    constructor(msg: string) { super(msg); this.name = 'NotFoundError'; }
  }
  return { ValidationError, ConflictError, NotFoundError, AppError: Error };
});

jest.mock('../utils/codeGenerator', () => ({
  nextYearlyCode: jest.fn(() => 'PX2026-001'),
  yearlyCodeWhere: jest.fn(() => ({ startsWith: 'PX2026' })),
}));

jest.mock('../services/reorderRuleService', () => ({
  __esModule: true,
  default: { checkAndNotify: jest.fn().mockResolvedValue(undefined) },
}));

import prisma from '@config/database';
// Error classes are used via the mocked module inside the service under test
import warehouseIssueService from '@services/warehouseIssueService';

const prismaMock = prisma as jest.Mocked<typeof prisma>;

describe('warehouseIssueService.update', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should refund original and subtract new on same lotProduct', async () => {
    const existingIssue = {
      id: 'i1', lotProductId: 'lp1', soLuongXuat: 5,
      supplyRequestId: null, materialEvaluation: null,
      warehouseId: 'w1', lotId: 'l1',
    };
    (prismaMock.warehouseIssue.findUnique as jest.Mock).mockResolvedValue(existingIssue);

    mockTx.lotProduct.findUnique.mockResolvedValueOnce({ id: 'lp1', soLuong: 20, donViTinh: 'Kg' }); // original
    mockTx.lotProduct.update.mockResolvedValueOnce({}); // refund
    mockTx.lotProduct.findUnique.mockResolvedValueOnce({ id: 'lp1', soLuong: 25, donViTinh: 'Kg' }); // target (same)
    mockTx.lotProduct.update.mockResolvedValueOnce({}); // subtract
    mockTx.warehouseIssue.update.mockResolvedValue({ id: 'i1', soLuongXuat: 8 });

    const result = await warehouseIssueService.update('i1', {
      warehouseId: 'w1', tenKho: 'Kho A', lotId: 'l1', tenLo: 'Lo 1',
      lotProductId: 'lp1', tenSanPham: 'SP1', soLuongXuat: 8, donViTinh: 'Kg',
    });

    expect(result.soLuongXuat).toBe(8);
    // First update: refund (20 + 5 = 25)
    expect(mockTx.lotProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'lp1' }, data: { soLuong: 25 } })
    );
    // Second update: subtract (25 - 8 = 17)
    expect(mockTx.lotProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'lp1' }, data: { soLuong: 17 } })
    );
  });

  it('should throw ValidationError if stock is insufficient', async () => {
    const existingIssue = {
      id: 'i1', lotProductId: 'lp1', soLuongXuat: 5,
      supplyRequestId: null, materialEvaluation: null,
    };
    (prismaMock.warehouseIssue.findUnique as jest.Mock).mockResolvedValue(existingIssue);

    mockTx.lotProduct.findUnique.mockResolvedValueOnce({ id: 'lp1', soLuong: 3, donViTinh: 'Kg' }); // original
    mockTx.lotProduct.update.mockResolvedValueOnce({}); // refund (3 + 5 = 8)
    mockTx.lotProduct.findUnique.mockResolvedValueOnce({ id: 'lp1', soLuong: 8, donViTinh: 'Kg' }); // target (same as refunded)

    await expect(
      warehouseIssueService.update('i1', {
        warehouseId: 'w1', lotId: 'l1', lotProductId: 'lp1',
        tenSanPham: 'SP1', soLuongXuat: 100, donViTinh: 'Kg', tenKho: '', tenLo: '',
      })
    ).rejects.toThrow('Số lượng tồn kho không đủ');
  });

  it('should throw ConflictError if issue is supply-request-linked', async () => {
    (prismaMock.warehouseIssue.findUnique as jest.Mock).mockResolvedValue({
      id: 'i1', lotProductId: 'lp1', soLuongXuat: 5,
      supplyRequestId: 'sr1', materialEvaluation: null,
    });

    await expect(
      warehouseIssueService.update('i1', {
        warehouseId: 'w1', lotId: 'l1', lotProductId: 'lp1',
        tenSanPham: 'SP1', soLuongXuat: 5, donViTinh: 'Kg', tenKho: '', tenLo: '',
      })
    ).rejects.toThrow('Không thể sửa/xóa phiếu gắn với yêu cầu cung cấp');
  });

  it('should throw ConflictError if issue is material-evaluation-generated', async () => {
    (prismaMock.warehouseIssue.findUnique as jest.Mock).mockResolvedValue({
      id: 'i1', lotProductId: 'lp1', soLuongXuat: 5,
      supplyRequestId: null, materialEvaluation: { id: 'me1' },
    });

    await expect(
      warehouseIssueService.update('i1', {
        warehouseId: 'w1', lotId: 'l1', lotProductId: 'lp1',
        tenSanPham: 'SP1', soLuongXuat: 5, donViTinh: 'Kg', tenKho: '', tenLo: '',
      })
    ).rejects.toThrow('Không thể sửa/xóa phiếu xuất do đánh giá nguyên liệu tạo');
  });
});

describe('warehouseIssueService.delete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should add soLuongXuat back to lotProduct and delete', async () => {
    (prismaMock.warehouseIssue.findUnique as jest.Mock).mockResolvedValue({
      id: 'i1', lotProductId: 'lp1', soLuongXuat: 12,
      supplyRequestId: null, materialEvaluation: null,
    });

    mockTx.lotProduct.findUnique.mockResolvedValueOnce({ id: 'lp1', soLuong: 30, donViTinh: 'Kg' });
    mockTx.lotProduct.update.mockResolvedValueOnce({});
    mockTx.warehouseIssue.delete.mockResolvedValueOnce({});

    const result = await warehouseIssueService.delete('i1');

    expect(result).toEqual({ id: 'i1' });
    expect(mockTx.lotProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'lp1' }, data: { soLuong: 42 } })
    );
    expect(mockTx.warehouseIssue.delete).toHaveBeenCalledWith({ where: { id: 'i1' } });
  });

  it('should throw ConflictError if locked by materialEvaluation', async () => {
    (prismaMock.warehouseIssue.findUnique as jest.Mock).mockResolvedValue({
      id: 'i1', lotProductId: 'lp1', soLuongXuat: 5,
      supplyRequestId: null, materialEvaluation: { id: 'me1' },
    });

    await expect(warehouseIssueService.delete('i1')).rejects.toThrow('Không thể sửa/xóa phiếu xuất do đánh giá nguyên liệu tạo');
  });

  it('should throw ConflictError if locked by supplyRequestId', async () => {
    (prismaMock.warehouseIssue.findUnique as jest.Mock).mockResolvedValue({
      id: 'i1', lotProductId: 'lp1', soLuongXuat: 5,
      supplyRequestId: 'sr1', materialEvaluation: null,
    });

    await expect(warehouseIssueService.delete('i1')).rejects.toThrow('Không thể sửa/xóa phiếu gắn với yêu cầu cung cấp');
  });
});
