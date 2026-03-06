import prisma from '@config/database';
import logger from '@config/logger';
import { TaxReportStatus } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/errors';
import ExcelJS from 'exceljs';

class OrderService {
  // Generate order code
  async generateOrderCode(): Promise<string> {
    const lastOrder = await prisma.order.findFirst({
      orderBy: { maDonHang: 'desc' },
      select: { maDonHang: true },
    });

    if (!lastOrder) {
      return 'DH-001';
    }

    const lastNumber = parseInt(lastOrder.maDonHang.split('-')[1]);
    const newNumber = lastNumber + 1;
    return `DH-${newNumber.toString().padStart(3, '0')}`;
  }

  // Create order from quotation
  async createOrderFromQuotation(quotationId: string, fileDinhKem?: string) {
    // Check if quotation exists
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        quotationRequest: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!quotation) {
      throw new NotFoundError('Không tìm thấy báo giá');
    }

    // Check if order already exists for this quotation
    const existingOrder = await prisma.order.findUnique({
      where: { quotationId },
    });

    if (existingOrder) {
      throw new ValidationError('Đơn hàng đã được tạo từ báo giá này');
    }

    // Generate order code
    const maDonHang = await this.generateOrderCode();

    // Create order with items
    const order = await prisma.order.create({
      data: {
        maDonHang,
        quotationId: quotation.id,
        maBaoGia: quotation.maBaoGia,
        quotationRequestId: quotation.quotationRequestId,
        maYeuCauBaoGia: quotation.maYeuCauBaoGia,
        customerId: quotation.customerId,
        maKhachHang: quotation.maKhachHang,
        tenKhachHang: quotation.tenKhachHang,
        employeeId: quotation.employeeId,
        tenNhanVien: quotation.tenNhanVien,
        fileDinhKem,
        items: {
          create: quotation.quotationRequest.items.map((item) => ({
            productId: item.productId,
            maSanPham: item.maSanPham,
            tenHangHoa: item.tenSanPham,
            yeuCauHangHoa: item.yeuCauSanPham,
            dongGoi: item.quyDongGoi,
            soLuong: item.soLuong,
            donVi: item.donViTinh,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // Automatically create tax report for the new order
    try {
      const tenHangHoa = order.items.map(item => item.tenHangHoa).join(', ');
      const soLuong = order.items.reduce((sum, item) => sum + item.soLuong, 0);
      const donVi = order.items[0]?.donVi || '';
      const giaTriDonHang = order.giaTriDonHangUSD || order.giaTriDonHangVND || 0;

      await prisma.taxReport.create({
        data: {
          orderId: order.id,
          ngayDatHang: order.ngayDatHang,
          maDonHang: order.maDonHang,
          tenHangHoa,
          soLuong,
          donVi,
          giaTriDonHang,
          trangThai: TaxReportStatus.CHUA_BAO_CAO,
        },
      });
      logger.info(`✅ Tax report created automatically for order ${order.maDonHang}`);
    } catch (error) {
      logger.error('⚠️ Failed to create tax report automatically:', error);
      // Don't throw error, just log it - order creation should still succeed
    }

    return order;
  }

  // Get all orders with pagination
  async getAllOrders(page: number = 1, limit: number = 10, search?: string, customerType?: string) {
    const skip = (page - 1) * limit;

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
        { maDonHang: { contains: search, mode: 'insensitive' as const } },
        { maBaoGia: { contains: search, mode: 'insensitive' as const } },
        { tenKhachHang: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { ngayDatHang: 'desc' },
        include: {
          items: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get order by ID
  async getOrderById(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        quotation: true,
        quotationRequest: true,
        customer: true,
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
      },
    });

    if (!order) {
      throw new NotFoundError('Không tìm thấy đơn hàng');
    }

    return order;
  }

  // Helper function to convert date string to DateTime
  private convertToDateTime(dateString?: string | Date): Date | undefined {
    if (!dateString) return undefined;
    // If already a Date object, return it
    if (dateString instanceof Date) return dateString;
    // If it's a string in format YYYY-MM-DD, convert to ISO DateTime
    if (typeof dateString === 'string') {
      // Check if it's already ISO format
      if (dateString.includes('T')) {
        return new Date(dateString);
      }
      // Convert YYYY-MM-DD to ISO DateTime
      return new Date(`${dateString}T00:00:00.000Z`);
    }
    return undefined;
  }

  // Update order
  async updateOrder(id: string, data: any) {
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundError('Không tìm thấy đơn hàng');
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        giaTriDonHangUSD: data.giaTriDonHangUSD,
        giaTriDonHangVND: data.giaTriDonHangVND,
        xuatKhauDot1USD: data.xuatKhauDot1USD,
        noiDiaDot1VND: data.noiDiaDot1VND,
        ngayThanhToanDot1: this.convertToDateTime(data.ngayThanhToanDot1),
        xuatKhauDot2USD: data.xuatKhauDot2USD,
        noiDiaDot2VND: data.noiDiaDot2VND,
        ngayThanhToanDot2: this.convertToDateTime(data.ngayThanhToanDot2),
        ngayBatDauSanXuatKeHoach: this.convertToDateTime(data.ngayBatDauSanXuatKeHoach),
        ngayHoanThanhSanXuatKeHoach: this.convertToDateTime(data.ngayHoanThanhSanXuatKeHoach),
        ngayHoanThanhThucTe: this.convertToDateTime(data.ngayHoanThanhThucTe),
        ngayGiaoHang: this.convertToDateTime(data.ngayGiaoHang),
        trangThaiSanXuat: data.trangThaiSanXuat,
        trangThaiThanhToan: data.trangThaiThanhToan,
        ghiChu: data.ghiChu,
        fileDinhKem: data.fileDinhKem,
      },
      include: {
        items: true,
      },
    });

    return updatedOrder;
  }

  // Update order item
  async updateOrderItem(itemId: string, data: any) {
    const item = await prisma.orderItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundError('Không tìm thấy hàng hóa');
    }

    const updatedItem = await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        loaiHangHoa: data.loaiHangHoa,
      },
    });

    return updatedItem;
  }

  // Delete order
  async deleteOrder(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundError('Không tìm thấy đơn hàng');
    }

    await prisma.order.delete({
      where: { id },
    });

    return { message: 'Xóa đơn hàng thành công' };
  }

  async exportToExcel(filters?: any): Promise<Buffer> {
    const where: any = {};
    if (filters?.search) {
      where.OR = [
        { maDonHang: { contains: filters.search, mode: 'insensitive' } },
        { tenKhachHang: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    const data = await prisma.order.findMany({
      where,
      include: { items: true, customer: true },
      orderBy: { createdAt: 'desc' },
    });
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách đơn hàng');
    worksheet.columns = [
      { header: 'Mã đơn hàng', key: 'maDonHang', width: 15 },
      { header: 'Ngày đặt hàng', key: 'ngayDatHang', width: 20 },
      { header: 'Khách hàng', key: 'tenKhachHang', width: 25 },
      { header: 'Quốc gia', key: 'quocGia', width: 15 },
      { header: 'Trạng thái SX', key: 'trangThaiSanXuat', width: 20 },
      { header: 'Ngày tạo', key: 'createdAt', width: 20 },
    ];
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    data.forEach((order) => {
      worksheet.addRow({
        maDonHang: order.maDonHang,
        ngayDatHang: order.ngayDatHang ? new Date(order.ngayDatHang).toLocaleDateString('vi-VN') : '',
        tenKhachHang: order.tenKhachHang || '',
        quocGia: order.customer?.quocGia || '',
        trangThaiSanXuat: order.trangThaiSanXuat || '',
        createdAt: new Date(order.createdAt).toLocaleDateString('vi-VN'),
      });
    });
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }
}

export default new OrderService();

