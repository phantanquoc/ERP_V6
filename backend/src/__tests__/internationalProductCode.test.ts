/**
 * Tests for the user-editable product code and category rename cascade in
 * InternationalProductService.
 *
 * Covers: code suggestion from name + category, hand-edited codes surviving create and
 * update, uniqueness enforcement, and the rename that rewrites code prefixes in bulk.
 */

const mockTx = {
  productCategory: {
    updateMany: jest.fn(),
  },
  internationalProduct: {
    updateMany: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    internationalProduct: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    productCategory: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@config/logger', () => ({
  __esModule: true,
  default: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import prisma from '@config/database';
import { InternationalProductService } from '@services/internationalProductService';

const db = prisma as any;
const service = new InternationalProductService();

beforeEach(() => {
  jest.clearAllMocks();
  db.$transaction.mockImplementation(async (fn: any) => fn(mockTx));
  mockTx.productCategory.updateMany.mockResolvedValue({ count: 1 });
  mockTx.internationalProduct.updateMany.mockResolvedValue({ count: 0 });
  mockTx.internationalProduct.update.mockResolvedValue({});
  // Categories come from the stored table merged with distinct values on products.
  db.productCategory.findMany.mockResolvedValue([]);
  db.internationalProduct.findMany.mockResolvedValue([]);
});

describe('generateProductCode', () => {
  it('derives the prefix from the category and starts at 001', async () => {
    db.internationalProduct.findMany.mockResolvedValue([]);
    const code = await service.generateProductCode('Mít trái lá bàng', 'Nguyên liệu trái');
    expect(code).toBe('NLT-001-MTLB');
  });

  it('continues the sequence within that category only', async () => {
    db.internationalProduct.findMany.mockResolvedValue([
      { maSanPham: 'NLT-001-TMLB' },
      { maSanPham: 'NLT-004-TMSS' },
    ]);
    const code = await service.generateProductCode('Trái chanh dây', 'Nguyên liệu trái');
    expect(code).toBe('NLT-005-TCD');
  });

  it('skips a sequence that is already taken by an identically named product', async () => {
    db.internationalProduct.findMany.mockResolvedValue([{ maSanPham: 'BB-001-BTV' }]);
    const code = await service.generateProductCode('Bao tay vải', 'Bao bì');
    expect(code).toBe('BB-002-BTV');
  });

  it('returns empty without a category, since the prefix is not derivable', async () => {
    expect(await service.generateProductCode('Mít trái lá bàng', undefined)).toBe('');
    expect(await service.generateProductCode('Mít trái lá bàng', '')).toBe('');
  });
});

describe('createProduct', () => {
  it('keeps a hand-edited code instead of overwriting it with a suggestion', async () => {
    db.internationalProduct.findUnique.mockResolvedValue(null);
    db.internationalProduct.create.mockImplementation(({ data }: any) => data);

    const result = await service.createProduct({
      maSanPham: 'NLT-099-TUCHON',
      tenSanPham: 'Mít trái lá bàng',
      loaiSanPham: 'Nguyên liệu trái',
    });

    expect(result.maSanPham).toBe('NLT-099-TUCHON');
    // No suggestion needed, so sibling codes were never read.
    expect(db.internationalProduct.findMany).not.toHaveBeenCalled();
  });

  it('suggests a code when the client leaves the field empty', async () => {
    db.internationalProduct.findMany.mockResolvedValue([]);
    db.internationalProduct.findUnique.mockResolvedValue(null);
    db.internationalProduct.create.mockImplementation(({ data }: any) => data);

    const result = await service.createProduct({
      maSanPham: '',
      tenSanPham: 'Trái sầu riêng',
      loaiSanPham: 'Nguyên liệu trái',
    });

    expect(result.maSanPham).toBe('NLT-001-TSR');
  });

  it('rejects a duplicate code', async () => {
    db.internationalProduct.findUnique.mockResolvedValue({ id: 'other', maSanPham: 'NLT-001-X' });

    await expect(
      service.createProduct({ maSanPham: 'NLT-001-X', tenSanPham: 'A', loaiSanPham: 'Nguyên liệu trái' })
    ).rejects.toThrow(/đã tồn tại/);
  });

  it('rejects a product with no name', async () => {
    await expect(service.createProduct({ tenSanPham: '' })).rejects.toThrow(/tên hàng hóa/i);
  });

  it('rejects when neither a code nor a category is given', async () => {
    await expect(
      service.createProduct({ tenSanPham: 'Không loại', maSanPham: '' })
    ).rejects.toThrow(/mã hàng hóa/i);
  });
});

describe('updateProduct', () => {
  const existing = { id: 'p1', maSanPham: 'NLT-001-MTLB', tenSanPham: 'Mít trái lá bàng' };

  it('allows changing the code to a free value', async () => {
    db.internationalProduct.findUnique
      .mockResolvedValueOnce(existing) // getProductById
      .mockResolvedValueOnce(null); // uniqueness probe
    db.internationalProduct.update.mockImplementation(({ data }: any) => ({ ...existing, ...data }));

    const result = await service.updateProduct('p1', { maSanPham: 'NLT-050-MOI' });
    expect(result.maSanPham).toBe('NLT-050-MOI');
  });

  it('does not treat the product own code as a conflict', async () => {
    db.internationalProduct.findUnique.mockResolvedValueOnce(existing);
    db.internationalProduct.update.mockImplementation(({ data }: any) => ({ ...existing, ...data }));

    // Saving without touching the code must not raise "already exists".
    const result = await service.updateProduct('p1', {
      maSanPham: 'NLT-001-MTLB',
      tenSanPham: 'Mít trái lá bàng (sửa)',
    });
    expect(result.maSanPham).toBe('NLT-001-MTLB');
  });

  it('rejects a code already used by another product', async () => {
    db.internationalProduct.findUnique
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce({ id: 'p2', maSanPham: 'NLT-002-KHAC' });

    await expect(service.updateProduct('p1', { maSanPham: 'NLT-002-KHAC' })).rejects.toThrow(
      /đã tồn tại/
    );
  });

  it('rejects blanking the code', async () => {
    db.internationalProduct.findUnique.mockResolvedValueOnce(existing);
    await expect(service.updateProduct('p1', { maSanPham: '   ' })).rejects.toThrow(
      /không được để trống/
    );
  });
});

describe('previewRenameCategory', () => {
  it('reports the new code for each product in the category', async () => {
    db.internationalProduct.findMany.mockResolvedValue([
      { id: 'a', maSanPham: 'NLT-001-MTLB', tenSanPham: 'Mít trái lá bàng' },
      { id: 'b', maSanPham: 'NLT-002-TCD', tenSanPham: 'Trái chanh dây' },
    ]);

    const preview = await service.previewRenameCategory('Nguyên liệu trái', 'Nguyên liệu trái tươi');

    expect(preview.oldAbbr).toBe('NLT');
    expect(preview.newAbbr).toBe('NLTT');
    expect(preview.changes).toEqual([
      { id: 'a', tenSanPham: 'Mít trái lá bàng', maCu: 'NLT-001-MTLB', maMoi: 'NLTT-001-MTLB' },
      { id: 'b', tenSanPham: 'Trái chanh dây', maCu: 'NLT-002-TCD', maMoi: 'NLTT-002-TCD' },
    ]);
    expect(preview.unchanged).toHaveLength(0);
  });

  it('lists legacy two-segment codes as unchanged rather than rewriting them', async () => {
    db.internationalProduct.findMany.mockResolvedValue([
      { id: 'a', maSanPham: 'NLT-TMITL', tenSanPham: 'Trái mít Lá Bàng' },
      { id: 'b', maSanPham: 'NLT-001-MTLB', tenSanPham: 'Mít trái lá bàng' },
    ]);

    // NLT -> NLTT, so the three-segment code changes while NLT-TMITL is left alone.
    const preview = await service.previewRenameCategory('Nguyên liệu trái', 'Nguyên liệu trái tươi');

    expect(preview.changes.map((c) => c.id)).toEqual(['b']);
    expect(preview.unchanged.map((u) => u.id)).toEqual(['a']);
  });

  it('reports no changes when the abbreviation is unaffected by the rename', async () => {
    db.internationalProduct.findMany.mockResolvedValue([
      { id: 'a', maSanPham: 'BB-001-TC', tenSanPham: 'Thùng carton' },
    ]);

    // "Bao bì" and "Bao bi" both abbreviate to BB.
    const preview = await service.previewRenameCategory('Bao bì', 'Bao bi');
    expect(preview.changes).toHaveLength(0);
    expect(preview.unchanged).toHaveLength(1);
  });

  it('rejects an empty new name', async () => {
    await expect(service.previewRenameCategory('Bao bì', '  ')).rejects.toThrow(
      /không được để trống/
    );
  });
});

describe('renameCategory', () => {
  it('renames the category and rewrites product codes in one transaction', async () => {
    db.productCategory.findUnique.mockResolvedValue(null);
    db.productCategory.findMany.mockResolvedValue([{ name: 'Nguyên liệu trái' }]);
    db.internationalProduct.findMany
      // getCategories (distinct loaiSanPham)
      .mockResolvedValueOnce([{ loaiSanPham: 'Nguyên liệu trái' }])
      // previewRenameCategory
      .mockResolvedValueOnce([
        { id: 'a', maSanPham: 'NLT-001-MTLB', tenSanPham: 'Mít trái lá bàng' },
      ])
      // collision probe
      .mockResolvedValueOnce([]);
    mockTx.internationalProduct.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.renameCategory('Nguyên liệu trái', 'Nguyên liệu trái tươi');

    expect(result).toEqual({ count: 1, codesUpdated: 1 });
    expect(mockTx.productCategory.updateMany).toHaveBeenCalledWith({
      where: { name: 'Nguyên liệu trái' },
      data: { name: 'Nguyên liệu trái tươi' },
    });
    expect(mockTx.internationalProduct.update).toHaveBeenCalledWith({
      where: { id: 'a' },
      data: { maSanPham: 'NLTT-001-MTLB' },
    });
  });

  it('refuses a rename whose abbreviation collides with another category', async () => {
    db.productCategory.findUnique.mockResolvedValue(null);
    db.productCategory.findMany.mockResolvedValue([{ name: 'Nhiên liệu' }]);
    db.internationalProduct.findMany.mockResolvedValueOnce([{ loaiSanPham: 'Bao bì' }]);

    // "Nguyên liệu" abbreviates to NL, same as the existing "Nhiên liệu".
    await expect(service.renameCategory('Bao bì', 'Nguyên liệu')).rejects.toThrow(/trùng với loại/);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('refuses when a rewritten code would collide with a product outside the category', async () => {
    db.productCategory.findUnique.mockResolvedValue(null);
    db.productCategory.findMany.mockResolvedValue([{ name: 'Nguyên liệu trái' }]);
    db.internationalProduct.findMany
      .mockResolvedValueOnce([{ loaiSanPham: 'Nguyên liệu trái' }])
      .mockResolvedValueOnce([
        { id: 'a', maSanPham: 'NLT-001-MTLB', tenSanPham: 'Mít trái lá bàng' },
      ])
      // A different product already owns the target code.
      .mockResolvedValueOnce([{ id: 'zzz', maSanPham: 'NLTT-001-MTLB' }]);

    await expect(
      service.renameCategory('Nguyên liệu trái', 'Nguyên liệu trái tươi')
    ).rejects.toThrow(/đã thuộc hàng hóa khác/);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('refuses renaming onto an existing category name', async () => {
    db.productCategory.findUnique.mockResolvedValue({ id: 'c2', name: 'Bao bì' });
    await expect(service.renameCategory('Phụ liệu', 'Bao bì')).rejects.toThrow(/đã tồn tại/);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe('addCategory', () => {
  it('refuses a name whose abbreviation collides with an existing category', async () => {
    db.productCategory.findUnique.mockResolvedValue(null);
    db.productCategory.findMany.mockResolvedValue([{ name: 'Nguyên liệu' }]);
    db.internationalProduct.findMany.mockResolvedValueOnce([]);

    await expect(service.addCategory('Nhiên liệu')).rejects.toThrow(/trùng với loại/);
    expect(db.productCategory.create).not.toHaveBeenCalled();
  });

  it('refuses a name with no letters or digits', async () => {
    db.productCategory.findUnique.mockResolvedValue(null);
    db.productCategory.findMany.mockResolvedValue([]);
    db.internationalProduct.findMany.mockResolvedValueOnce([]);

    await expect(service.addCategory('***')).rejects.toThrow(/ít nhất một chữ cái/);
  });

  it('creates a category whose abbreviation is free', async () => {
    db.productCategory.findUnique.mockResolvedValue(null);
    db.productCategory.findMany.mockResolvedValue([{ name: 'Bao bì' }]);
    db.internationalProduct.findMany.mockResolvedValueOnce([]);
    db.productCategory.create.mockImplementation(({ data }: any) => ({ id: 'new', ...data }));

    const created = await service.addCategory('Thành phẩm sấy');
    expect(created.name).toBe('Thành phẩm sấy');
  });
});
