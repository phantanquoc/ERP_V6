import prisma from '@config/database';
import logger from '@config/logger';
import { NotFoundError, ValidationError } from '@utils/errors';
import { getPaginationParams, calculateTotalPages } from '@utils/helpers';
import {
  categoryAbbr,
  rewriteCodePrefix,
  suggestAvailableProductCodeFor,
} from '@utils/productCode';
import type { PaginatedResponse } from '@types';
import ExcelJS from 'exceljs';

/**
 * Columns the list may be sorted by. Whitelisted so a client-supplied `sortBy` cannot
 * reach an arbitrary column or a relation.
 */
export const PRODUCT_SORT_FIELDS = [
  'maSanPham',
  'tenSanPham',
  'loaiSanPham',
  'donViTinh',
  'moTaSanPham',
  'giaThanh',
  'createdAt',
] as const;

export type ProductSortField = (typeof PRODUCT_SORT_FIELDS)[number];

export interface ProductListFilters {
  search?: string;
  loaiSanPham?: string;
  maSanPham?: string;
  tenSanPham?: string;
  donViTinh?: string;
  sortBy?: ProductSortField;
  sortOrder?: 'asc' | 'desc';
}

export class InternationalProductService {
  /**
   * Suggest a code in LOAI-STT-TENVIETTAT form. Returns '' when the category is missing,
   * since the prefix is derived from it — the UI then leaves the field for the user.
   *
   * This is a suggestion, not a reservation: the user may edit it, and the unique
   * constraint on maSanPham is what actually guarantees correctness.
   */
  async generateProductCode(tenSanPham?: string, loaiSanPham?: string): Promise<string> {
    if (!loaiSanPham) return '';
    return suggestAvailableProductCodeFor(prisma, {
      tenSanPham: tenSanPham || '',
      loaiSanPham,
    });
  }

  /**
   * Build the `where` clause shared by the list and the Excel export, so an export
   * reflects exactly the rows the user is looking at.
   *
   * Per-column filters narrow within the global search rather than replacing it.
   */
  private buildProductWhere(filters?: ProductListFilters): any {
    const where: any = {};

    if (filters?.search) {
      where.OR = [
        { maSanPham: { contains: filters.search, mode: 'insensitive' as const } },
        { tenSanPham: { contains: filters.search, mode: 'insensitive' as const } },
        { moTaSanPham: { contains: filters.search, mode: 'insensitive' as const } },
      ];
    }
    if (filters?.loaiSanPham) {
      where.loaiSanPham = filters.loaiSanPham;
    }
    if (filters?.maSanPham) {
      where.maSanPham = { contains: filters.maSanPham, mode: 'insensitive' as const };
    }
    if (filters?.tenSanPham) {
      where.tenSanPham = { contains: filters.tenSanPham, mode: 'insensitive' as const };
    }
    if (filters?.donViTinh) {
      where.donViTinh = { contains: filters.donViTinh, mode: 'insensitive' as const };
    }

    return where;
  }

  /**
   * Resolve the sort clause, falling back to newest-first.
   *
   * Sorting runs in the database, not over the returned page: the list is paginated
   * server-side, so sorting one page would order 20 rows out of many. `sortBy` is
   * whitelisted so a query param cannot reach an arbitrary column.
   */
  private buildProductOrderBy(filters?: ProductListFilters): any {
    const sortBy: ProductSortField = PRODUCT_SORT_FIELDS.includes(filters?.sortBy as ProductSortField)
      ? (filters!.sortBy as ProductSortField)
      : 'createdAt';
    const sortOrder = filters?.sortOrder === 'asc' ? 'asc' : 'desc';
    return { [sortBy]: sortOrder };
  }

  async getAllProducts(
    page: number = 1,
    limit: number = 10,
    search?: string,
    loaiSanPham?: string,
    filters?: ProductListFilters
  ): Promise<PaginatedResponse<any>> {
    const { skip } = getPaginationParams(page, limit);

    const where = this.buildProductWhere({ ...filters, search, loaiSanPham });
    const orderBy = this.buildProductOrderBy(filters);

    const [products, total] = await Promise.all([
      prisma.internationalProduct.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      prisma.internationalProduct.count({ where }),
    ]);

    return {
      data: products,
      total,
      page,
      limit,
      totalPages: calculateTotalPages(total, limit),
    };
  }

  async getProductById(id: string): Promise<any> {
    const product = await prisma.internationalProduct.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundError('International product not found');
    }

    return product;
  }

  async getProductByCode(code: string): Promise<any> {
    const product = await prisma.internationalProduct.findUnique({
      where: { maSanPham: code },
    });

    if (!product) {
      throw new NotFoundError('International product not found');
    }

    return product;
  }

  /**
   * Whitelist the writable columns. The controller forwards req.body wholesale, so an
   * unexpected key would otherwise reach Prisma and fail with an opaque error.
   *
   * `giaThanh` (VND / unit, nullable) is the default price for the stock item; when the
   * warehouse creates a new parcel (LotProduct) it seeds its unit price from this field
   * instead of the hardcoded 100,000 placeholder. Pass `null` or `''` to clear the default.
   */
  private pickProductFields(data: any) {
    const out: Record<string, any> = {};
    for (const key of ['tenSanPham', 'moTaSanPham', 'loaiSanPham', 'donViTinh'] as const) {
      if (data[key] !== undefined) out[key] = data[key];
    }
    if (data.giaThanh !== undefined) {
      if (data.giaThanh === null || data.giaThanh === '') {
        out.giaThanh = null;
      } else {
        const n = typeof data.giaThanh === 'number' ? data.giaThanh : parseFloat(String(data.giaThanh));
        if (!Number.isFinite(n) || n < 0) throw new ValidationError('Giá thành phải là số không âm');
        out.giaThanh = n;
      }
    }
    return out;
  }

  async createProduct(data: any): Promise<any> {
    if (!data.tenSanPham) {
      throw new ValidationError('Thiếu tên hàng hóa');
    }

    // The client sends the code the user sees (possibly hand-edited). Fall back to a
    // suggestion only when it left the field empty.
    const maSanPham = (data.maSanPham || '').trim()
      || (await this.generateProductCode(data.tenSanPham, data.loaiSanPham));

    if (!maSanPham) {
      throw new ValidationError('Thiếu mã hàng hóa — chọn loại hàng hóa để hệ thống gợi ý mã');
    }

    const existingProduct = await prisma.internationalProduct.findUnique({
      where: { maSanPham },
    });

    if (existingProduct) {
      throw new ValidationError(`Mã hàng hóa "${maSanPham}" đã tồn tại`);
    }

    return prisma.internationalProduct.create({
      data: {
        ...this.pickProductFields(data),
        // Repeated explicitly so Prisma sees the required column; the guard above
        // already rejected a missing name.
        tenSanPham: data.tenSanPham,
        maSanPham,
      },
    });
  }

  async updateProduct(id: string, data: any): Promise<any> {
    const current = await this.getProductById(id);

    // The code is user-editable, so a change has to be checked against other rows —
    // excluding this one, otherwise saving a product without touching its code fails.
    if (data.maSanPham !== undefined) {
      const nextCode = (data.maSanPham || '').trim();
      if (!nextCode) {
        throw new ValidationError('Mã hàng hóa không được để trống');
      }
      if (nextCode !== current.maSanPham) {
        const clash = await prisma.internationalProduct.findUnique({
          where: { maSanPham: nextCode },
        });
        if (clash && clash.id !== id) {
          throw new ValidationError(`Mã hàng hóa "${nextCode}" đã tồn tại`);
        }
      }
      data = { ...data, maSanPham: nextCode };
    }

    return prisma.internationalProduct.update({
      where: { id },
      data: {
        ...this.pickProductFields(data),
        ...(data.maSanPham !== undefined ? { maSanPham: data.maSanPham } : {}),
      },
    });
  }

  async deleteProduct(id: string): Promise<void> {
    const product = await this.getProductById(id);
    logger.debug('Attempting to delete product:', product.maSanPham);

    // Check if product is being used in quotation request items
    const quotationRequestItems = await prisma.quotationRequestItem.count({
      where: { productId: id },
    });

    logger.debug('Quotation request items count:', quotationRequestItems);

    if (quotationRequestItems > 0) {
      const errorMsg = `Không thể xóa sản phẩm này vì đang được sử dụng trong ${quotationRequestItems} yêu cầu báo giá`;
      logger.debug('Throwing ValidationError:', errorMsg);
      throw new ValidationError(errorMsg);
    }

    // Check if product is being used in order items
    const orderItems = await prisma.orderItem.count({
      where: { productId: id },
    });

    if (orderItems > 0) {
      throw new ValidationError(
        `Không thể xóa sản phẩm này vì đang được sử dụng trong ${orderItems} đơn hàng`
      );
    }

    await prisma.internationalProduct.delete({
      where: { id },
    });
  }

  async exportToExcel(filters?: ProductListFilters): Promise<Buffer> {
    // Same where/orderBy as the list, so the file matches what is on screen.
    const data = await prisma.internationalProduct.findMany({
      where: this.buildProductWhere(filters),
      orderBy: this.buildProductOrderBy(filters),
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách sản phẩm quốc tế');

    // Column order mirrors the on-screen table so an export is recognisable, and
    // includes đơn vị tính — without it the export drops a field the UI now shows.
    worksheet.columns = [
      { header: 'Mã hàng hóa', key: 'maSanPham', width: 20 },
      { header: 'Tên hàng hóa', key: 'tenSanPham', width: 40 },
      { header: 'Loại hàng hóa', key: 'loaiSanPham', width: 26 },
      { header: 'Đơn vị tính', key: 'donViTinh', width: 12 },
      { header: 'Giá thành (VND)', key: 'giaThanh', width: 16 },
      { header: 'Mô tả', key: 'moTaSanPham', width: 40 },
      { header: 'Ngày tạo', key: 'createdAt', width: 14 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    data.forEach((item) => {
      worksheet.addRow({
        maSanPham: item.maSanPham,
        tenSanPham: item.tenSanPham,
        loaiSanPham: item.loaiSanPham || '',
        donViTinh: item.donViTinh || '',
        giaThanh: item.giaThanh != null ? Number(item.giaThanh).toLocaleString('vi-VN') : '',
        moTaSanPham: item.moTaSanPham || '',
        createdAt: new Date(item.createdAt).toLocaleDateString('vi-VN'),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }
  async getCategories(): Promise<string[]> {
    // Lấy categories từ bảng ProductCategory
    const storedCategories = await prisma.productCategory.findMany({
      orderBy: { name: 'asc' },
    });
    const storedNames = storedCategories.map(c => c.name);

    // Lấy categories từ distinct loaiSanPham (backward compatibility)
    const products = await prisma.internationalProduct.findMany({
      where: {
        loaiSanPham: { not: null },
      },
      select: {
        loaiSanPham: true,
      },
      distinct: ['loaiSanPham'],
      orderBy: {
        loaiSanPham: 'asc',
      },
    });
    const productCategories = products.map(p => p.loaiSanPham!).filter(Boolean);

    // Merge và deduplicate
    const allCategories = Array.from(new Set([...storedNames, ...productCategories]));
    allCategories.sort((a, b) => a.localeCompare(b, 'vi'));
    return allCategories;
  }

  /**
   * Reject a category name whose abbreviation collides with an existing category.
   *
   * Abbreviations are derived from the name, and they become the code prefix — two
   * categories sharing one ("Nguyên liệu" and "Nhiên liệu" are both NL) would make their
   * products' codes indistinguishable. Rejecting is better than auto-suffixing, which
   * would produce prefixes nobody can predict from the name.
   */
  private async assertAbbrAvailable(name: string, excludeName?: string): Promise<void> {
    const abbr = categoryAbbr(name);
    if (!abbr) {
      throw new ValidationError('Tên loại hàng hóa phải có ít nhất một chữ cái hoặc số');
    }

    const others = await this.getCategories();
    const clash = others.find(
      (other) => other !== excludeName && other !== name && categoryAbbr(other) === abbr
    );
    if (clash) {
      throw new ValidationError(
        `Viết tắt "${abbr}" của loại "${name}" trùng với loại "${clash}". Đổi tên để viết tắt khác nhau.`
      );
    }
  }

  async addCategory(name: string): Promise<any> {
    if (!name || !name.trim()) {
      throw new ValidationError('Tên loại hàng hóa không được để trống');
    }
    const trimmed = name.trim();

    // Check if already exists
    const existing = await prisma.productCategory.findUnique({
      where: { name: trimmed },
    });
    if (existing) {
      throw new ValidationError('Loại hàng hóa này đã tồn tại');
    }

    await this.assertAbbrAvailable(trimmed);

    return prisma.productCategory.create({
      data: { name: trimmed },
    });
  }

  /**
   * What renaming a category would do to its products' codes, without writing anything.
   * The UI shows this for confirmation, because a rename rewrites codes in bulk.
   */
  async previewRenameCategory(
    oldName: string,
    newName: string
  ): Promise<{
    oldAbbr: string;
    newAbbr: string;
    changes: Array<{ id: string; tenSanPham: string; maCu: string; maMoi: string }>;
    unchanged: Array<{ id: string; tenSanPham: string; maCu: string }>;
  }> {
    if (!oldName || !newName || !newName.trim()) {
      throw new ValidationError('Tên loại hàng hóa không được để trống');
    }
    const trimmed = newName.trim();

    const oldAbbr = categoryAbbr(oldName);
    const newAbbr = categoryAbbr(trimmed);

    const products = await prisma.internationalProduct.findMany({
      where: { loaiSanPham: oldName },
      select: { id: true, maSanPham: true, tenSanPham: true },
      orderBy: { maSanPham: 'asc' },
    });

    const changes: Array<{ id: string; tenSanPham: string; maCu: string; maMoi: string }> = [];
    const unchanged: Array<{ id: string; tenSanPham: string; maCu: string }> = [];

    for (const p of products) {
      const maMoi = rewriteCodePrefix(p.maSanPham, newAbbr);
      if (maMoi !== p.maSanPham) {
        changes.push({ id: p.id, tenSanPham: p.tenSanPham, maCu: p.maSanPham, maMoi });
      } else {
        // Either the abbreviation did not change, or the code is a legacy two-segment
        // one that rewriteCodePrefix deliberately leaves alone.
        unchanged.push({ id: p.id, tenSanPham: p.tenSanPham, maCu: p.maSanPham });
      }
    }

    return { oldAbbr, newAbbr, changes, unchanged };
  }

  /**
   * Rename a category and rewrite the code prefix of every product in it.
   *
   * All writes go in one transaction: a partial rename would leave products whose code
   * prefix disagrees with their category.
   */
  async renameCategory(
    oldName: string,
    newName: string
  ): Promise<{ count: number; codesUpdated: number }> {
    if (!oldName || !newName || !newName.trim()) {
      throw new ValidationError('Tên loại hàng hóa không được để trống');
    }
    const trimmed = newName.trim();

    if (trimmed !== oldName) {
      const duplicate = await prisma.productCategory.findUnique({ where: { name: trimmed } });
      if (duplicate) {
        throw new ValidationError('Loại hàng hóa này đã tồn tại');
      }
    }

    await this.assertAbbrAvailable(trimmed, oldName);

    const { changes } = await this.previewRenameCategory(oldName, trimmed);

    // Guard against a rewritten code colliding with one outside this category, which
    // would otherwise surface as a raw Prisma unique-constraint error mid-transaction.
    if (changes.length > 0) {
      const targets = changes.map((c) => c.maMoi);
      const movingIds = new Set(changes.map((c) => c.id));
      const clashes = await prisma.internationalProduct.findMany({
        where: { maSanPham: { in: targets } },
        select: { id: true, maSanPham: true },
      });
      const blocking = clashes.filter((c) => !movingIds.has(c.id));
      if (blocking.length > 0) {
        throw new ValidationError(
          `Không thể đổi tên: mã mới ${blocking.map((b) => `"${b.maSanPham}"`).join(', ')} đã thuộc hàng hóa khác`
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      await tx.productCategory.updateMany({
        where: { name: oldName },
        data: { name: trimmed },
      });

      const result = await tx.internationalProduct.updateMany({
        where: { loaiSanPham: oldName },
        data: { loaiSanPham: trimmed },
      });

      for (const change of changes) {
        await tx.internationalProduct.update({
          where: { id: change.id },
          data: { maSanPham: change.maMoi },
        });
      }

      return { count: result.count, codesUpdated: changes.length };
    });
  }

  async deleteCategory(name: string): Promise<number> {
    if (!name) {
      throw new ValidationError('Tên loại hàng hóa không được để trống');
    }

    // Delete from ProductCategory table
    await prisma.productCategory.deleteMany({
      where: { name },
    });

    // Clear loaiSanPham in products
    const result = await prisma.internationalProduct.updateMany({
      where: { loaiSanPham: name },
      data: { loaiSanPham: null },
    });

    return result.count;
  }

  /**
   * Raw materials for the kiosk picker, each carrying its total available Kg stock.
   *
   * Zero-stock materials are returned rather than filtered out: the picker hides them
   * by default but offers a reveal-all control, which workers need when material has
   * physically arrived before the warehouse has issued its receipt.
   */
  async getRawMaterials(): Promise<Array<Record<string, unknown> & { tongTonKho: number }>> {
    const products = await prisma.internationalProduct.findMany({
      where: { loaiSanPham: { startsWith: 'Nguyên liệu', mode: 'insensitive' } },
      orderBy: { maSanPham: 'asc' },
    });

    if (products.length === 0) {
      return [];
    }

    // One aggregate for every product, not one query per product.
    const stockRows = await prisma.lotProduct.groupBy({
      by: ['internationalProductId'],
      where: {
        internationalProductId: { in: products.map(p => p.id) },
        soLuong: { gt: 0 },
        donViTinh: 'Kg',
      },
      _sum: { soLuong: true },
    });

    const stockByProduct = new Map(
      stockRows.map(row => [row.internationalProductId, row._sum.soLuong ?? 0]),
    );

    return products.map(product => ({
      ...product,
      tongTonKho: stockByProduct.get(product.id) ?? 0,
    }));
  }

  async getStockSummary(productId: string): Promise<{
    totalQuantity: number;
    unit: string | null;
    lotDetails: Array<{
      lotId: string;
      lotName: string;
      warehouseName: string;
      quantity: number;
      unit: string;
    }>;
  }> {
    const lotProducts = await prisma.lotProduct.findMany({
      where: { internationalProductId: productId },
      include: {
        lot: {
          include: { warehouse: true },
        },
      },
    });

    if (lotProducts.length === 0) {
      return {
        totalQuantity: 0,
        unit: null,
        lotDetails: [],
      };
    }

    const totalQuantity = lotProducts.reduce((sum, lp) => sum + lp.soLuong, 0);
    const unit = lotProducts[0]?.donViTinh || null;

    const lotDetails = lotProducts.map(lp => ({
      lotId: lp.lotId,
      lotName: lp.lot.tenLo,
      warehouseName: lp.lot.warehouse.tenKho,
      quantity: lp.soLuong,
      unit: lp.donViTinh,
    }));

    return {
      totalQuantity,
      unit,
      lotDetails,
    };
  }
}

export default new InternationalProductService();

