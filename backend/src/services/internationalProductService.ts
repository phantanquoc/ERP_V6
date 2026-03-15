import prisma from '@config/database';
import logger from '@config/logger';
import { NotFoundError, ValidationError } from '@utils/errors';
import { getPaginationParams, calculateTotalPages } from '@utils/helpers';
import type { PaginatedResponse } from '@types';
import ExcelJS from 'exceljs';

export class InternationalProductService {
  /**
   * Generate product code
   * Format: SP-{SEQUENCE}
   * Example: SP-001, SP-002
   */
  async generateProductCode(): Promise<string> {
    const lastProduct = await prisma.internationalProduct.findFirst({
      where: {
        maSanPham: {
          startsWith: 'SP-',
        },
      },
      orderBy: {
        maSanPham: 'desc',
      },
    });

    let sequence = 1;
    if (lastProduct) {
      const lastCode = lastProduct.maSanPham;
      const sequenceStr = lastCode.replace('SP-', '');
      if (sequenceStr) {
        sequence = parseInt(sequenceStr, 10) + 1;
      }
    }

    return `SP-${String(sequence).padStart(3, '0')}`;
  }

  async getAllProducts(
    page: number = 1,
    limit: number = 10,
    search?: string
  ): Promise<PaginatedResponse<any>> {
    const { skip } = getPaginationParams(page, limit);

    const where = search
      ? {
          OR: [
            { maSanPham: { contains: search, mode: 'insensitive' as const } },
            { tenSanPham: { contains: search, mode: 'insensitive' as const } },
            { moTaSanPham: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [products, total] = await Promise.all([
      prisma.internationalProduct.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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

  async createProduct(data: any): Promise<any> {
    // Validate required fields
    if (!data.tenSanPham) {
      throw new ValidationError('Missing required fields');
    }

    // Generate product code if not provided
    if (!data.maSanPham) {
      data.maSanPham = await this.generateProductCode();
    }

    // Check if product code already exists
    const existingProduct = await prisma.internationalProduct.findUnique({
      where: { maSanPham: data.maSanPham },
    });

    if (existingProduct) {
      throw new ValidationError('Product code already exists');
    }

    const product = await prisma.internationalProduct.create({
      data,
    });

    return product;
  }

  async updateProduct(id: string, data: any): Promise<any> {
    // Check if product exists
    await this.getProductById(id);

    const product = await prisma.internationalProduct.update({
      where: { id },
      data,
    });

    return product;
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

  async exportToExcel(filters?: any): Promise<Buffer> {
    const where: any = {};

    if (filters?.search) {
      where.OR = [
        { maSanPham: { contains: filters.search, mode: 'insensitive' as const } },
        { tenSanPham: { contains: filters.search, mode: 'insensitive' as const } },
        { moTaSanPham: { contains: filters.search, mode: 'insensitive' as const } },
      ];
    }

    const data = await prisma.internationalProduct.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách sản phẩm quốc tế');

    worksheet.columns = [
      { header: 'Mã sản phẩm', key: 'maSanPham', width: 20 },
      { header: 'Tên sản phẩm', key: 'tenSanPham', width: 30 },
      { header: 'Mô tả sản phẩm', key: 'moTaSanPham', width: 40 },
      { header: 'Loại sản phẩm', key: 'loaiSanPham', width: 20 },
      { header: 'Ngày tạo', key: 'createdAt', width: 20 },
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
        moTaSanPham: item.moTaSanPham || '',
        loaiSanPham: item.loaiSanPham || '',
        createdAt: new Date(item.createdAt).toLocaleDateString('vi-VN'),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }
  async getCategories(): Promise<string[]> {
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

    return products.map(p => p.loaiSanPham!).filter(Boolean);
  }

  async renameCategory(oldName: string, newName: string): Promise<number> {
    if (!oldName || !newName) {
      throw new ValidationError('Tên loại hàng hóa không được để trống');
    }

    const result = await prisma.internationalProduct.updateMany({
      where: { loaiSanPham: oldName },
      data: { loaiSanPham: newName },
    });

    return result.count;
  }

  async deleteCategory(name: string): Promise<number> {
    if (!name) {
      throw new ValidationError('Tên loại hàng hóa không được để trống');
    }

    const result = await prisma.internationalProduct.updateMany({
      where: { loaiSanPham: name },
      data: { loaiSanPham: null },
    });

    return result.count;
  }
}

export default new InternationalProductService();

