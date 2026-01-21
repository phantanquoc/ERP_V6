import prisma from '@config/database';
import { NotFoundError, ValidationError } from '@utils/errors';
import { getPaginationParams, calculateTotalPages } from '@utils/helpers';
import type { PaginatedResponse } from '@types';

export class QuotationRequestService {
  /**
   * Generate quotation request code
   * Format: YC-BG{SEQUENCE}
   * Example: YC-BG001, YC-BG002
   */
  async generateQuotationRequestCode(): Promise<string> {
    const lastRequest = await prisma.quotationRequest.findFirst({
      where: {
        maYeuCauBaoGia: {
          startsWith: 'YC-BG',
        },
      },
      orderBy: {
        maYeuCauBaoGia: 'desc',
      },
    });

    let sequence = 1;
    if (lastRequest) {
      const lastCode = lastRequest.maYeuCauBaoGia;
      const sequenceStr = lastCode.replace('YC-BG', '');
      if (sequenceStr) {
        sequence = parseInt(sequenceStr, 10) + 1;
      }
    }

    return `YC-BG${String(sequence).padStart(3, '0')}`;
  }

  async getAllQuotationRequests(
    page: number = 1,
    limit: number = 10,
    search?: string,
    customerType?: string // "Quốc tế" hoặc "Nội địa"
  ): Promise<PaginatedResponse<any>> {
    const { skip } = getPaginationParams(page, limit);

    const where: any = {};

    // Filter by customerType (Quốc tế / Nội địa)
    if (customerType === 'Quốc tế') {
      where.customer = { quocGia: { not: null } };
    } else if (customerType === 'Nội địa') {
      where.customer = { tinhThanh: { not: null } };
    }

    // Search filter
    if (search) {
      where.OR = [
        { maYeuCauBaoGia: { contains: search, mode: 'insensitive' as const } },
        { maNhanVien: { contains: search, mode: 'insensitive' as const } },
        { tenNhanVien: { contains: search, mode: 'insensitive' as const } },
        { maKhachHang: { contains: search, mode: 'insensitive' as const } },
        { tenKhachHang: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const [requests, total] = await Promise.all([
      prisma.quotationRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          customer: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      }),
      prisma.quotationRequest.count({ where }),
    ]);

    return {
      data: requests,
      total,
      page,
      limit,
      totalPages: calculateTotalPages(total, limit),
    };
  }

  async getQuotationRequestById(id: string): Promise<any> {
    const request = await prisma.quotationRequest.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundError('Quotation request not found');
    }

    return request;
  }

  async getQuotationRequestByCode(code: string): Promise<any> {
    const request = await prisma.quotationRequest.findUnique({
      where: { maYeuCauBaoGia: code },
      include: {
        employee: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundError('Quotation request not found');
    }

    return request;
  }

  async createQuotationRequest(data: any): Promise<any> {
    // Validate required fields
    if (!data.employeeId || !data.customerId || !data.items || !Array.isArray(data.items) || data.items.length === 0) {
      throw new ValidationError('Missing required fields: employeeId, customerId, items (must be non-empty array)');
    }

    // Validate each item
    for (const item of data.items) {
      if (!item.productId || item.soLuong === undefined || item.soLuong === null || !item.donViTinh || item.donViTinh.trim() === '') {
        throw new ValidationError('Each item must have: productId, soLuong, donViTinh');
      }
    }

    // Generate quotation request code if not provided
    if (!data.maYeuCauBaoGia) {
      data.maYeuCauBaoGia = await this.generateQuotationRequestCode();
    }

    // Check if quotation request code already exists
    const existingRequest = await prisma.quotationRequest.findUnique({
      where: { maYeuCauBaoGia: data.maYeuCauBaoGia },
    });

    if (existingRequest) {
      throw new ValidationError('Quotation request code already exists');
    }

    // Get employee info to denormalize
    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Get customer info to denormalize
    const customer = await prisma.internationalCustomer.findUnique({
      where: { id: data.customerId },
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Prepare items with denormalized product data
    const itemsData = await Promise.all(
      data.items.map(async (item: any) => {
        const product = await prisma.internationalProduct.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundError(`Product not found: ${item.productId}`);
        }

        return {
          productId: item.productId,
          maSanPham: product.maSanPham,
          tenSanPham: product.tenSanPham,
          moTaSanPham: product.moTaSanPham,
          yeuCauSanPham: item.yeuCauSanPham,
          quyDongGoi: item.quyDongGoi,
          soLuong: item.soLuong,
          donViTinh: item.donViTinh,
          giaDoiThuBan: item.giaDoiThuBan,
          giaBanGanNhat: item.giaBanGanNhat,
        };
      })
    );

    // Create quotation request with items in a transaction
    const request = await prisma.quotationRequest.create({
      data: {
        maYeuCauBaoGia: data.maYeuCauBaoGia,
        employeeId: data.employeeId,
        maNhanVien: employee.employeeCode,
        tenNhanVien: `${employee.user.firstName} ${employee.user.lastName}`,
        customerId: data.customerId,
        maKhachHang: customer.maKhachHang,
        tenKhachHang: customer.tenCongTy,
        hinhThucVanChuyen: data.hinhThucVanChuyen,
        hinhThucThanhToan: data.hinhThucThanhToan,
        quocGia: data.quocGia,
        cangDen: data.cangDen,
        ghiChu: data.ghiChu,
        items: {
          create: itemsData,
        },
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return request;
  }

  async updateQuotationRequest(id: string, data: any): Promise<any> {
    // Check if quotation request exists
    await this.getQuotationRequestById(id);

    const updateData: any = {};

    // If updating customer, get new customer info
    if (data.customerId) {
      const customer = await prisma.internationalCustomer.findUnique({
        where: { id: data.customerId },
      });

      if (!customer) {
        throw new NotFoundError('Customer not found');
      }

      updateData.customerId = data.customerId;
      updateData.maKhachHang = customer.maKhachHang;
      updateData.tenKhachHang = customer.tenCongTy;
    }

    // Update other fields
    if (data.hinhThucVanChuyen !== undefined) updateData.hinhThucVanChuyen = data.hinhThucVanChuyen;
    if (data.hinhThucThanhToan !== undefined) updateData.hinhThucThanhToan = data.hinhThucThanhToan;
    if (data.quocGia !== undefined) updateData.quocGia = data.quocGia;
    if (data.cangDen !== undefined) updateData.cangDen = data.cangDen;
    if (data.ghiChu !== undefined) updateData.ghiChu = data.ghiChu;

    // If updating items
    if (data.items && Array.isArray(data.items)) {
      // Validate each item
      for (const item of data.items) {
        if (!item.productId || item.soLuong === undefined || item.soLuong === null || !item.donViTinh || item.donViTinh.trim() === '') {
          throw new ValidationError('Each item must have: productId, soLuong, donViTinh');
        }
      }

      // Prepare items with denormalized product data
      const itemsData = await Promise.all(
        data.items.map(async (item: any) => {
          const product = await prisma.internationalProduct.findUnique({
            where: { id: item.productId },
          });

          if (!product) {
            throw new NotFoundError(`Product not found: ${item.productId}`);
          }

          return {
            productId: item.productId,
            maSanPham: product.maSanPham,
            tenSanPham: product.tenSanPham,
            moTaSanPham: product.moTaSanPham,
            yeuCauSanPham: item.yeuCauSanPham,
            quyDongGoi: item.quyDongGoi,
            soLuong: item.soLuong,
            donViTinh: item.donViTinh,
            giaDoiThuBan: item.giaDoiThuBan,
            giaBanGanNhat: item.giaBanGanNhat,
          };
        })
      );

      // Delete old items and create new ones
      updateData.items = {
        deleteMany: {},
        create: itemsData,
      };
    }

    const request = await prisma.quotationRequest.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return request;
  }

  async deleteQuotationRequest(id: string): Promise<void> {
    await this.getQuotationRequestById(id);

    await prisma.quotationRequest.delete({
      where: { id },
    });
  }
}

export default new QuotationRequestService();

