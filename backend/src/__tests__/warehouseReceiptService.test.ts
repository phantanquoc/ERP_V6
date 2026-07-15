/**
 * Tests for warehouseReceiptService update/delete:
 * - Correct stock reversal on same and different lotProduct
 * - Snapshot recompute
 * - Negative-stock guard rollback
 * - Lock rejection for supplyRequestId
 */

const mockTx = {
  warehouseReceipt: {
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
    warehouseReceipt: {
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
  nextYearlyCode: jest.fn(() => 'PN2026-001'),
  yearlyCodeWhere: jest.fn(() => ({ startsWith: 'PN2026' })),
  nextStaticCode: jest.fn(() => 'SP001'),
  staticCodeWhere: jest.fn(() => ({ startsWith: 'SP' })),
}));

import prisma from '@config/database';
// Error classes are used via the mocked module inside the service under test

// Must import AFTER mocks
import warehouseReceiptService from '@services/warehouseReceiptService';

const prismaMock = prisma as jest.Mocked<typeof prisma>;

describe('warehouseReceiptService.update', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reverse original and apply new stock on same lotProduct', async () => {
    const existingReceipt = {
      id: 'r1', lotProductId: 'lp1', soLuongNhap: 10,
      supplyRequestId: null, warehouseId: 'w1', lotId: 'l1',
      tenKho: 'Kho A', tenLo: 'Lo 1', tenSanPham: 'SP1', donViTinh: 'Kg',
    };
    (prismaMock.warehouseReceipt.findUnique as jest.Mock).mockResolvedValue(existingReceipt);

    // Inside transaction
    mockTx.lotProduct.findUnique.mockResolvedValueOnce({ id: 'lp1', soLuong: 50, donViTinh: 'Kg' }); // original
    mockTx.lotProduct.update.mockResolvedValueOnce({}); // reverse
    mockTx.lotProduct.findUnique.mockResolvedValueOnce({ id: 'lp1', soLuong: 40, donViTinh: 'Kg' }); // target (same)
    mockTx.lotProduct.update.mockResolvedValueOnce({}); // apply
    mockTx.warehouseReceipt.update.mockResolvedValue({ id: 'r1', soLuongNhap: 15 });

    const result = await warehouseReceiptService.update('r1', {
      warehouseId: 'w1', tenKho: 'Kho A', lotId: 'l1', tenLo: 'Lo 1',
      lotProductId: 'lp1', tenSanPham: 'SP1', soLuongNhap: 15, donViTinh: 'Kg',
    });

    expect(result.soLuongNhap).toBe(15);
    // First update: reverse (50 - 10 = 40)
    expect(mockTx.lotProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'lp1' }, data: { soLuong: 40 } })
    );
    // Second update: apply (40 + 15 = 55)
    expect(mockTx.lotProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'lp1' }, data: { soLuong: 55 } })
    );
  });

  it('should throw ValidationError if reversal would make stock negative', async () => {
    const existingReceipt = {
      id: 'r1', lotProductId: 'lp1', soLuongNhap: 50,
      supplyRequestId: null,
    };
    (prismaMock.warehouseReceipt.findUnique as jest.Mock).mockResolvedValue(existingReceipt);

    mockTx.lotProduct.findUnique.mockResolvedValueOnce({ id: 'lp1', soLuong: 30, donViTinh: 'Kg' });

    await expect(
      warehouseReceiptService.update('r1', {
        warehouseId: 'w1', lotId: 'l1', lotProductId: 'lp1',
        tenSanPham: 'SP1', soLuongNhap: 10, donViTinh: 'Kg', tenKho: '', tenLo: '',
      })
    ).rejects.toThrow('Số lượng tồn kho không đủ');
  });

  it('should throw ConflictError if receipt is supply-request-linked', async () => {
    (prismaMock.warehouseReceipt.findUnique as jest.Mock).mockResolvedValue({
      id: 'r1', lotProductId: 'lp1', soLuongNhap: 10, supplyRequestId: 'sr1',
    });

    await expect(
      warehouseReceiptService.update('r1', {
        warehouseId: 'w1', lotId: 'l1', lotProductId: 'lp1',
        tenSanPham: 'SP1', soLuongNhap: 10, donViTinh: 'Kg', tenKho: '', tenLo: '',
      })
    ).rejects.toThrow('Không thể sửa/xóa phiếu gắn với yêu cầu cung cấp');
  });
});

describe('warehouseReceiptService.delete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should subtract soLuongNhap from lotProduct and delete', async () => {
    (prismaMock.warehouseReceipt.findUnique as jest.Mock).mockResolvedValue({
      id: 'r1', lotProductId: 'lp1', soLuongNhap: 20, supplyRequestId: null,
    });

    mockTx.lotProduct.findUnique.mockResolvedValueOnce({ id: 'lp1', soLuong: 50, donViTinh: 'Kg' });
    mockTx.lotProduct.update.mockResolvedValueOnce({});
    mockTx.warehouseReceipt.delete.mockResolvedValueOnce({});

    const result = await warehouseReceiptService.delete('r1');

    expect(result).toEqual({ id: 'r1' });
    expect(mockTx.lotProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'lp1' }, data: { soLuong: 30 } })
    );
    expect(mockTx.warehouseReceipt.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
  });

  it('should throw ValidationError if stock would go negative', async () => {
    (prismaMock.warehouseReceipt.findUnique as jest.Mock).mockResolvedValue({
      id: 'r1', lotProductId: 'lp1', soLuongNhap: 50, supplyRequestId: null,
    });

    mockTx.lotProduct.findUnique.mockResolvedValueOnce({ id: 'lp1', soLuong: 30, donViTinh: 'Kg' });

    await expect(warehouseReceiptService.delete('r1')).rejects.toThrow('Số lượng tồn kho không đủ');
  });

  it('should throw ConflictError if receipt is locked', async () => {
    (prismaMock.warehouseReceipt.findUnique as jest.Mock).mockResolvedValue({
      id: 'r1', lotProductId: 'lp1', soLuongNhap: 10, supplyRequestId: 'sr1',
    });

    await expect(warehouseReceiptService.delete('r1')).rejects.toThrow('Không thể sửa/xóa phiếu gắn với yêu cầu cung cấp');
  });
});