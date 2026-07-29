/**
 * Sorting and per-column filtering on the product list.
 *
 * The list is paginated server-side, so both must run in the database — sorting the
 * returned page would only order one page's worth of rows.
 */

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    internationalProduct: { findMany: jest.fn(), count: jest.fn() },
  },
}));

jest.mock('@config/logger', () => ({
  __esModule: true,
  default: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import prisma from '@config/database';
import {
  InternationalProductService,
  PRODUCT_SORT_FIELDS,
} from '@services/internationalProductService';

const db = prisma as any;
const service = new InternationalProductService();

/** The args Prisma received for the page query. */
const listArgs = () => db.internationalProduct.findMany.mock.calls[0][0];

beforeEach(() => {
  jest.clearAllMocks();
  db.internationalProduct.findMany.mockResolvedValue([]);
  db.internationalProduct.count.mockResolvedValue(0);
});

describe('sorting', () => {
  it('defaults to newest first when nothing is requested', async () => {
    await service.getAllProducts(1, 20);
    expect(listArgs().orderBy).toEqual({ createdAt: 'desc' });
  });

  it.each(PRODUCT_SORT_FIELDS)('sorts by %s in both directions', async (field) => {
    await service.getAllProducts(1, 20, undefined, undefined, { sortBy: field, sortOrder: 'asc' });
    expect(listArgs().orderBy).toEqual({ [field]: 'asc' });

    jest.clearAllMocks();
    db.internationalProduct.findMany.mockResolvedValue([]);
    db.internationalProduct.count.mockResolvedValue(0);

    await service.getAllProducts(1, 20, undefined, undefined, { sortBy: field, sortOrder: 'desc' });
    expect(listArgs().orderBy).toEqual({ [field]: 'desc' });
  });

  it('ignores a column that is not whitelisted', async () => {
    // A query param must not be able to order by an arbitrary column.
    await service.getAllProducts(1, 20, undefined, undefined, {
      sortBy: 'id; DROP TABLE' as any,
      sortOrder: 'asc',
    });
    expect(listArgs().orderBy).toEqual({ createdAt: 'asc' });
  });

  it('treats an unrecognised direction as desc', async () => {
    await service.getAllProducts(1, 20, undefined, undefined, {
      sortBy: 'tenSanPham',
      sortOrder: 'sideways' as any,
    });
    expect(listArgs().orderBy).toEqual({ tenSanPham: 'desc' });
  });

  it('sorts in the query, not over the returned page', async () => {
    await service.getAllProducts(2, 20, undefined, undefined, { sortBy: 'maSanPham', sortOrder: 'asc' });
    const args = listArgs();
    // Skip/take are still applied, so ordering must be part of the same query.
    expect(args.skip).toBe(20);
    expect(args.take).toBe(20);
    expect(args.orderBy).toEqual({ maSanPham: 'asc' });
  });
});

describe('per-column filters', () => {
  it('filters by code, name and unit case-insensitively', async () => {
    await service.getAllProducts(1, 20, undefined, undefined, {
      maSanPham: 'nlt',
      tenSanPham: 'mít',
      donViTinh: 'kg',
    });
    expect(listArgs().where).toEqual({
      maSanPham: { contains: 'nlt', mode: 'insensitive' },
      tenSanPham: { contains: 'mít', mode: 'insensitive' },
      donViTinh: { contains: 'kg', mode: 'insensitive' },
    });
  });

  it('combines a column filter with the global search rather than replacing it', async () => {
    await service.getAllProducts(1, 20, 'bàng', undefined, { donViTinh: 'Thùng' });
    const where = listArgs().where;
    expect(where.OR).toHaveLength(3);
    expect(where.donViTinh).toEqual({ contains: 'Thùng', mode: 'insensitive' });
  });

  it('keeps the category filter as an exact match', async () => {
    // The category comes from a dropdown of known values, so a partial match would let
    // "Nguyên liệu trái" also return "Nguyên liệu trái tươi".
    await service.getAllProducts(1, 20, undefined, 'Bao bì');
    expect(listArgs().where.loaiSanPham).toBe('Bao bì');
  });

  it('ignores empty filter strings', async () => {
    await service.getAllProducts(1, 20, '', '', { maSanPham: '', tenSanPham: '', donViTinh: '' });
    expect(listArgs().where).toEqual({});
  });

  it('applies the same filters to the count so pagination matches', async () => {
    await service.getAllProducts(1, 20, undefined, undefined, { maSanPham: 'nlt' });
    const countWhere = db.internationalProduct.count.mock.calls[0][0].where;
    expect(countWhere).toEqual(listArgs().where);
  });
});

describe('export', () => {
  it('uses the same where and orderBy as the list', async () => {
    await service.getAllProducts(1, 20, 'bàng', 'Bao bì', {
      donViTinh: 'Cái',
      sortBy: 'tenSanPham',
      sortOrder: 'asc',
    });
    const listWhere = listArgs().where;
    const listOrder = listArgs().orderBy;

    jest.clearAllMocks();
    db.internationalProduct.findMany.mockResolvedValue([]);

    await service.exportToExcel({
      search: 'bàng',
      loaiSanPham: 'Bao bì',
      donViTinh: 'Cái',
      sortBy: 'tenSanPham',
      sortOrder: 'asc',
    });
    const exportArgs = db.internationalProduct.findMany.mock.calls[0][0];

    expect(exportArgs.where).toEqual(listWhere);
    expect(exportArgs.orderBy).toEqual(listOrder);
    // The export is the whole result set, not one page.
    expect(exportArgs.skip).toBeUndefined();
    expect(exportArgs.take).toBeUndefined();
  });
});
