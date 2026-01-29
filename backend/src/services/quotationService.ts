import prisma from '@config/database';
import { NotFoundError, ValidationError } from '@utils/errors';
import { getPaginationParams, calculateTotalPages } from '@utils/helpers';

export class QuotationService {
  /**
   * Generate quotation code
   * Format: BG-{maYeuCauBaoGia}
   * Example: BG-YC-BG001, BG-YC-BG002
   */
  async generateQuotationCode(maYeuCauBaoGia: string): Promise<string> {
    return `BG-${maYeuCauBaoGia}`;
  }

  /**
   * Get all quotations with pagination
   */
  async getAllQuotations(page: number, limit: number, search?: string, customerType?: string): Promise<any> {
    const { skip } = getPaginationParams(page, limit);

    const where: any = {};

    // Filter by customerType (Quốc tế / Nội địa)
    if (customerType === 'Quốc tế') {
      where.customer = { quocGia: { not: null } };
    } else if (customerType === 'Nội địa') {
      where.customer = { tinhThanh: { not: null } };
    }

    if (search) {
      where.OR = [
        { maBaoGia: { contains: search, mode: 'insensitive' } },
        { maYeuCauBaoGia: { contains: search, mode: 'insensitive' } },
        { tenKhachHang: { contains: search, mode: 'insensitive' } },
        { tenSanPham: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [quotations, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          quotationRequest: {
            include: {
              items: true,
              calculator: {
                include: {
                  products: {
                    include: {
                      byProducts: true,
                    },
                  },
                },
              },
            },
          },
          items: true,
        },
      }),
      prisma.quotation.count({ where }),
    ]);

    const totalPages = calculateTotalPages(total, limit);

    return {
      data: quotations,
      page,
      limit,
      total,
      totalPages,
    };
  }

  /**
   * Get quotation by ID
   */
  async getQuotationById(id: string): Promise<any> {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        quotationRequest: {
          include: {
            items: true,
          },
        },
        items: true,
      },
    });

    if (!quotation) {
      throw new NotFoundError('Quotation not found');
    }

    return quotation;
  }

  /**
   * Create quotation
   */
  async createQuotation(data: any): Promise<any> {
    // Get quotation request info
    const quotationRequest = await prisma.quotationRequest.findUnique({
      where: { id: data.quotationRequestId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!quotationRequest) {
      throw new NotFoundError('Quotation request not found');
    }

    // Generate quotation code if not provided
    if (!data.maBaoGia) {
      data.maBaoGia = await this.generateQuotationCode(quotationRequest.maYeuCauBaoGia);
    }

    // Check if quotation code already exists
    const existingQuotation = await prisma.quotation.findUnique({
      where: { maBaoGia: data.maBaoGia },
    });

    if (existingQuotation) {
      throw new ValidationError('Quotation code already exists');
    }

    // Get material standard info if provided
    let materialStandard = null;
    if (data.materialStandardId) {
      materialStandard = await prisma.materialStandard.findUnique({
        where: { id: data.materialStandardId },
        include: {
          items: true,
        },
      });

      if (!materialStandard) {
        throw new NotFoundError('Material standard not found');
      }
    }

    // Use first item from quotation request for product info
    const firstItem = quotationRequest.items[0];
    if (!firstItem) {
      throw new ValidationError('Quotation request has no items');
    }

    // Prepare quotation items data
    const quotationItemsData = data.items?.map((item: any) => ({
      tenThanhPham: item.tenThanhPham,
      tiLe: parseFloat(item.tiLe),
      khoiLuongTuongUng: item.khoiLuongTuongUng ? parseFloat(item.khoiLuongTuongUng) : null,
    })) || [];

    // Create quotation
    const quotation = await prisma.quotation.create({
      data: {
        maBaoGia: data.maBaoGia,
        quotationRequestId: data.quotationRequestId,
        maYeuCauBaoGia: quotationRequest.maYeuCauBaoGia,
        customerId: quotationRequest.customerId,
        maKhachHang: quotationRequest.maKhachHang,
        tenKhachHang: quotationRequest.tenKhachHang,
        productId: firstItem.productId,
        tenSanPham: firstItem.tenSanPham,
        khoiLuong: firstItem.soLuong,
        donViTinh: firstItem.donViTinh,
        materialStandardId: data.materialStandardId || null,
        maDinhMuc: materialStandard?.maDinhMuc || null,
        tenDinhMuc: materialStandard?.tenDinhMuc || null,
        tiLeThuHoi: data.tiLeThuHoi ? parseFloat(data.tiLeThuHoi) : null,
        sanPhamDauRa: data.sanPhamDauRa || null,
        thanhPhamTonKho: data.thanhPhamTonKho ? parseFloat(data.thanhPhamTonKho) : null,
        tongThanhPhamCanSxThem: data.tongThanhPhamCanSxThem ? parseFloat(data.tongThanhPhamCanSxThem) : null,
        tongNguyenLieuCanSanXuat: data.tongNguyenLieuCanSanXuat ? parseFloat(data.tongNguyenLieuCanSanXuat) : null,
        nguyenLieuTonKho: data.nguyenLieuTonKho ? parseFloat(data.nguyenLieuTonKho) : null,
        nguyenLieuCanNhapThem: data.nguyenLieuCanNhapThem ? parseFloat(data.nguyenLieuCanNhapThem) : null,
        tinhTrang: data.tinhTrang || 'DRAFT',
        ghiChu: data.ghiChu || null,
        items: quotationItemsData.length > 0 ? {
          create: quotationItemsData,
        } : undefined,
      },
      include: {
        quotationRequest: {
          include: {
            items: true,
          },
        },
        items: true,
      },
    });

    return quotation;
  }

  /**
   * Update quotation
   */
  async updateQuotation(id: string, data: any): Promise<any> {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
    });

    if (!quotation) {
      throw new NotFoundError('Quotation not found');
    }

    // Get material standard info if materialStandardId is being updated
    let materialStandard = null;
    if (data.materialStandardId) {
      materialStandard = await prisma.materialStandard.findUnique({
        where: { id: data.materialStandardId },
        include: {
          items: true,
        },
      });

      if (!materialStandard) {
        throw new NotFoundError('Material standard not found');
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (data.materialStandardId !== undefined) {
      updateData.materialStandardId = data.materialStandardId;
      updateData.maDinhMuc = materialStandard?.maDinhMuc || null;
      updateData.tenDinhMuc = materialStandard?.tenDinhMuc || null;
    }

    if (data.tiLeThuHoi !== undefined) updateData.tiLeThuHoi = data.tiLeThuHoi ? parseFloat(data.tiLeThuHoi) : null;
    if (data.sanPhamDauRa !== undefined) updateData.sanPhamDauRa = data.sanPhamDauRa;
    if (data.thanhPhamTonKho !== undefined) updateData.thanhPhamTonKho = data.thanhPhamTonKho ? parseFloat(data.thanhPhamTonKho) : null;
    if (data.tongThanhPhamCanSxThem !== undefined) updateData.tongThanhPhamCanSxThem = data.tongThanhPhamCanSxThem ? parseFloat(data.tongThanhPhamCanSxThem) : null;
    if (data.tongNguyenLieuCanSanXuat !== undefined) updateData.tongNguyenLieuCanSanXuat = data.tongNguyenLieuCanSanXuat ? parseFloat(data.tongNguyenLieuCanSanXuat) : null;
    if (data.nguyenLieuTonKho !== undefined) updateData.nguyenLieuTonKho = data.nguyenLieuTonKho ? parseFloat(data.nguyenLieuTonKho) : null;
    if (data.nguyenLieuCanNhapThem !== undefined) updateData.nguyenLieuCanNhapThem = data.nguyenLieuCanNhapThem ? parseFloat(data.nguyenLieuCanNhapThem) : null;
    if (data.giaBaoKhach !== undefined) updateData.giaBaoKhach = data.giaBaoKhach ? parseFloat(data.giaBaoKhach) : null;
    if (data.thoiGianGiaoHang !== undefined) updateData.thoiGianGiaoHang = data.thoiGianGiaoHang ? parseInt(data.thoiGianGiaoHang) : null;
    if (data.hieuLucBaoGia !== undefined) updateData.hieuLucBaoGia = data.hieuLucBaoGia ? parseInt(data.hieuLucBaoGia) : null;
    if (data.tinhTrang !== undefined) updateData.tinhTrang = data.tinhTrang;
    if (data.ghiChu !== undefined) updateData.ghiChu = data.ghiChu;

    // Update quotation items if provided
    if (data.items && Array.isArray(data.items)) {
      // Delete existing items
      await prisma.quotationItem.deleteMany({
        where: { quotationId: id },
      });

      // Create new items
      updateData.items = {
        create: data.items.map((item: any) => ({
          tenThanhPham: item.tenThanhPham,
          tiLe: parseFloat(item.tiLe),
          khoiLuongTuongUng: item.khoiLuongTuongUng ? parseFloat(item.khoiLuongTuongUng) : null,
        })),
      };
    }

    const updatedQuotation = await prisma.quotation.update({
      where: { id },
      data: updateData,
      include: {
        quotationRequest: {
          include: {
            items: true,
          },
        },
        items: true,
      },
    });

    return updatedQuotation;
  }

  /**
   * Delete quotation
   */
  async deleteQuotation(id: string): Promise<void> {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
    });

    if (!quotation) {
      throw new NotFoundError('Quotation not found');
    }

    await prisma.quotation.delete({
      where: { id },
    });
  }
}

export default new QuotationService();

