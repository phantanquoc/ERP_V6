import { PrismaClient, TaxReportStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Interface for creating/updating tax report
export interface CreateTaxReportInput {
  orderId: string;
  soTienDongThue?: number;
  trangThai?: TaxReportStatus;
  ghiChi?: string;
  fileDinhKem?: string;
}

export interface UpdateTaxReportInput {
  soTienDongThue?: number;
  trangThai?: TaxReportStatus;
  ghiChi?: string;
  fileDinhKem?: string;
}

class TaxReportService {
  // Get all tax reports with pagination
  async getAllTaxReports(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { maDonHang: { contains: search, mode: 'insensitive' } },
        { tenHangHoa: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.taxReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            include: {
              items: true,
              customer: true,
            },
          },
        },
      }),
      prisma.taxReport.count({ where }),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get tax report by ID
  async getTaxReportById(id: string) {
    return await prisma.taxReport.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            items: true,
            customer: true,
          },
        },
      },
    });
  }

  // Get tax report by order ID
  async getTaxReportByOrderId(orderId: string) {
    return await prisma.taxReport.findUnique({
      where: { orderId },
      include: {
        order: {
          include: {
            items: true,
            customer: true,
          },
        },
      },
    });
  }

  // Create tax report from order
  async createTaxReportFromOrder(orderId: string, input?: Partial<CreateTaxReportInput>) {
    // Get order with items
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Check if tax report already exists
    const existing = await prisma.taxReport.findUnique({
      where: { orderId },
    });

    if (existing) {
      throw new Error('Tax report already exists for this order');
    }

    // Calculate aggregated data from order items
    const tenHangHoa = order.items.map(item => item.tenHangHoa).join(', ');
    const soLuong = order.items.reduce((sum, item) => sum + item.soLuong, 0);
    const donVi = order.items[0]?.donVi || '';
    const giaTriDonHang = order.giaTriDonHangUSD || order.giaTriDonHangVND || 0;

    // Create tax report
    return await prisma.taxReport.create({
      data: {
        orderId,
        ngayDatHang: order.ngayDatHang,
        maDonHang: order.maDonHang,
        tenHangHoa,
        soLuong,
        donVi,
        giaTriDonHang,
        soTienDongThue: input?.soTienDongThue,
        trangThai: input?.trangThai || TaxReportStatus.CHUA_BAO_CAO,
        ghiChi: input?.ghiChi,
        fileDinhKem: input?.fileDinhKem,
      },
      include: {
        order: {
          include: {
            items: true,
            customer: true,
          },
        },
      },
    });
  }

  // Update tax report
  async updateTaxReport(id: string, input: UpdateTaxReportInput) {
    return await prisma.taxReport.update({
      where: { id },
      data: input,
      include: {
        order: {
          include: {
            items: true,
            customer: true,
          },
        },
      },
    });
  }

  // Delete tax report
  async deleteTaxReport(id: string) {
    return await prisma.taxReport.delete({
      where: { id },
    });
  }
}

export default new TaxReportService();

