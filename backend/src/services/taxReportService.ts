import prisma from '@config/database';
import { TaxReportStatus } from '@prisma/client';
import ExcelJS from 'exceljs';

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

  // Export to Excel
  async exportToExcel(_filters?: any): Promise<Buffer> {
    const data = await prisma.taxReport.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Báo cáo thuế');

    worksheet.columns = [
      { header: 'Ngày đặt hàng', key: 'ngayDatHang', width: 18 },
      { header: 'Mã đơn hàng', key: 'maDonHang', width: 18 },
      { header: 'Tên hàng hoá', key: 'tenHangHoa', width: 30 },
      { header: 'Số lượng', key: 'soLuong', width: 12 },
      { header: 'Đơn vị', key: 'donVi', width: 12 },
      { header: 'Giá trị đơn hàng', key: 'giaTriDonHang', width: 20 },
      { header: 'Số tiền đóng thuế', key: 'soTienDongThue', width: 20 },
      { header: 'Trạng thái', key: 'trangThai', width: 25 },
      { header: 'Ghi chú', key: 'ghiChi', width: 30 },
      { header: 'Ngày tạo', key: 'createdAt', width: 18 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    const statusLabels: Record<string, string> = {
      CHUA_BAO_CAO: 'Chưa báo cáo',
      DANG_CAP_NHAT_HO_SO: 'Đang cập nhật hồ sơ',
      DA_DAY_DU_HO_SO: 'Đã đầy đủ hồ sơ',
      DA_BAO_CAO: 'Đã báo cáo',
      DA_QUYET_TOAN: 'Đã quyết toán',
    };

    data.forEach((item) => {
      worksheet.addRow({
        ngayDatHang: item.ngayDatHang ? new Date(item.ngayDatHang).toLocaleDateString('vi-VN') : '',
        maDonHang: item.maDonHang || '',
        tenHangHoa: item.tenHangHoa || '',
        soLuong: item.soLuong || 0,
        donVi: item.donVi || '',
        giaTriDonHang: item.giaTriDonHang || 0,
        soTienDongThue: item.soTienDongThue || 0,
        trangThai: statusLabels[item.trangThai] || item.trangThai,
        ghiChi: item.ghiChi || '',
        createdAt: new Date(item.createdAt).toLocaleDateString('vi-VN'),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }
}

export default new TaxReportService();

