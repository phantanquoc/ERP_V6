import prisma from '@config/database';
import logger from '@config/logger';
import { TaxReportStatus, UserRole } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/errors';
import ExcelJS from 'exceljs';
import notificationService from './notificationService';
import { broadcast } from './websocket';

class OrderService {
  /**
   * Lấy tên đầy đủ của user theo userId.
   * Trả về 'Hệ thống' nếu không tìm thấy.
   */
  private async getUserDisplayName(userId?: string): Promise<string> {
    if (!userId) return 'Hệ thống';
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    return user ? `${user.firstName} ${user.lastName}` : 'Hệ thống';
  }

  /**
   * Lấy employeeIds cần nhận notification khi có thay đổi đơn hàng:
   *   - Tất cả admin
   *   - Nhân viên trong bộ phận kinh doanh (department.code = 'business')
   *   - Employee được assign trên đơn hàng
   * Loại trừ người thực hiện thay đổi (actorUserId).
   */
  private async getOrderNotifyEmployeeIds(
    assignedEmployeeId: string | null,
    actorUserId?: string
  ): Promise<string[]> {
    // Admin users
    const adminUsers = await prisma.user.findMany({
      where: { role: UserRole.ADMIN, isActive: true },
      select: { id: true, employees: { select: { id: true } } },
    });

    // Nhân viên bộ phận kinh doanh
    const bizDept = await prisma.department.findFirst({
      where: { code: 'business' },
      select: { id: true, subDepartments: { select: { id: true } } },
    });

    const bizSubDeptIds = bizDept?.subDepartments.map(s => s.id) ?? [];

    const bizEmployees = bizSubDeptIds.length > 0
      ? await prisma.employee.findMany({
          where: { subDepartmentId: { in: bizSubDeptIds }, status: 'ACTIVE' },
          select: { id: true, userId: true },
        })
      : [];

    const idSet = new Set<string>();

    for (const u of adminUsers) {
      if (u.employees?.id) idSet.add(u.employees.id);
    }
    for (const e of bizEmployees) {
      idSet.add(e.id);
    }
    if (assignedEmployeeId) idSet.add(assignedEmployeeId);

    // Loại trừ người thực hiện
    if (actorUserId) {
      const actorEmployee = await prisma.employee.findUnique({
        where: { userId: actorUserId },
        select: { id: true },
      });
      if (actorEmployee) idSet.delete(actorEmployee.id);
    }

    return [...idSet];
  }

  // Generate order code
  async generateOrderCode(): Promise<string> {    const lastOrder = await prisma.order.findFirst({
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
  async createOrderFromQuotation(quotationId: string, fileDinhKem?: string, actorUserId?: string) {
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

    // Broadcast so all connected clients refresh their order lists
    broadcast({ type: 'ORDER_CHANGED' });

    // Notify admin + bộ phận kinh doanh về đơn hàng mới
    try {
      const actorName = await this.getUserDisplayName(actorUserId);
      const employeeIds = await this.getOrderNotifyEmployeeIds(
        order.employeeId ?? null,
        actorUserId
      );
      if (employeeIds.length > 0) {
        await notificationService.createOrderNotifications(
          employeeIds,
          order.id,
          order.maDonHang,
          'Đơn hàng mới được tạo',
          actorName
        );
      }
    } catch (error) {
      logger.error('❌ Error sending new order notifications:', error);
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
  async updateOrder(id: string, data: any, actorUserId?: string) {
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

    // Notify khi trạng thái sản xuất thay đổi
    if (data.trangThaiSanXuat && data.trangThaiSanXuat !== order.trangThaiSanXuat) {
      try {
        const actorName = await this.getUserDisplayName(actorUserId);
        const employeeIds = await this.getOrderNotifyEmployeeIds(
          updatedOrder.employeeId ?? null,
          actorUserId
        );
        if (employeeIds.length > 0) {
          await notificationService.createOrderNotifications(
            employeeIds,
            updatedOrder.id,
            updatedOrder.maDonHang,
            data.trangThaiSanXuat,
            actorName
          );
        }
        broadcast({ type: 'ORDER_CHANGED' });
      } catch (error) {
        logger.error('❌ Error sending order production status notification:', error);
      }
    }

    // Notify khi trạng thái thanh toán thay đổi
    if (data.trangThaiThanhToan && data.trangThaiThanhToan !== order.trangThaiThanhToan) {
      try {
        const actorName = await this.getUserDisplayName(actorUserId);
        const employeeIds = await this.getOrderNotifyEmployeeIds(
          updatedOrder.employeeId ?? null,
          actorUserId
        );
        if (employeeIds.length > 0) {
          await notificationService.createOrderNotifications(
            employeeIds,
            updatedOrder.id,
            updatedOrder.maDonHang,
            data.trangThaiThanhToan,
            actorName
          );
        }
        broadcast({ type: 'ORDER_CHANGED' });
      } catch (error) {
        logger.error('❌ Error sending order payment status notification:', error);
      }
    }

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

