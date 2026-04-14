import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError, ValidationError } from '@utils/errors';
import ExcelJS from 'exceljs';
import { NotificationType } from '@types';
import notificationService from '@services/notificationService';

interface SupplyRequestItemInput {
  phanLoai: string;
  tenGoi: string;
  soLuong: number;
  donViTinh: string;
}

interface CreateSupplyRequestRequest {
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  boPhan: string;
  items: SupplyRequestItemInput[];
  mucDichYeuCau: string;
  mucDoUuTien: string;
  ghiChu?: string;
  fileKemTheo?: string;
}

interface UpdateSupplyRequestRequest {
  items?: SupplyRequestItemInput[];
  mucDichYeuCau?: string;
  mucDoUuTien?: string;
  ghiChu?: string;
  fileKemTheo?: string;
}

// Status sequence for advancement checks
const STATUS_SEQUENCE = ['Chưa cung cấp', 'Đang xử lý', 'Đã duyệt mua', 'Đã mua hàng', 'Đã cung cấp'];

class SupplyRequestService {
  async getAllSupplyRequests(page: number = 1, limit: number = 10, search?: string) {
    const { skip } = getPaginationParams(page, limit);

    const where = search
      ? {
          OR: [
            { maYeuCau: { contains: search, mode: 'insensitive' as const } },
            { tenNhanVien: { contains: search, mode: 'insensitive' as const } },
            { maNhanVien: { contains: search, mode: 'insensitive' as const } },
            {
              items: {
                some: {
                  OR: [
                    { tenGoi: { contains: search, mode: 'insensitive' as const } },
                    { phanLoai: { contains: search, mode: 'insensitive' as const } },
                  ],
                },
              },
            },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      prisma.supplyRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          employee: {
            include: {
              user: true,
              position: true,
            },
          },
          items: true,
          purchaseRequests: true,
          warehouseReceipts: true,
        },
      }),
      prisma.supplyRequest.count({ where }),
    ]);

    return {
      data,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    };
  }

  async getSupplyRequestById(id: string) {
    const supplyRequest = await prisma.supplyRequest.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: true,
            position: true,
          },
        },
        items: true,
        purchaseRequests: true,
        warehouseReceipts: true,
      },
    });

    if (!supplyRequest) {
      throw new NotFoundError('Supply request not found');
    }

    return supplyRequest;
  }

  async createSupplyRequest(data: CreateSupplyRequestRequest) {
    // Validate employeeId exists
    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
    });
    if (!employee) {
      throw new ValidationError('Không tìm thấy thông tin nhân viên. Vui lòng đăng nhập lại.');
    }

    if (!data.items || data.items.length === 0) {
      throw new ValidationError('Phải có ít nhất một sản phẩm trong yêu cầu cung cấp.');
    }

    // Use transaction to prevent race condition on code generation
    const supplyRequest = await prisma.$transaction(async (tx) => {
      const lastRequest = await tx.supplyRequest.findFirst({
        orderBy: { maYeuCau: 'desc' },
      });

      let sequence = 1;
      if (lastRequest && lastRequest.maYeuCau) {
        const match = lastRequest.maYeuCau.match(/YC-CC(\d+)/);
        if (match) {
          sequence = parseInt(match[1], 10) + 1;
        }
      }
      const maYeuCau = `YC-CC${sequence.toString().padStart(3, '0')}`;

      const created = await tx.supplyRequest.create({
        data: {
          maYeuCau,
          employeeId: data.employeeId,
          maNhanVien: data.maNhanVien,
          tenNhanVien: data.tenNhanVien,
          boPhan: data.boPhan,
          mucDichYeuCau: data.mucDichYeuCau,
          mucDoUuTien: data.mucDoUuTien,
          ghiChu: data.ghiChu,
          trangThai: 'Chưa cung cấp',
          fileKemTheo: data.fileKemTheo,
        },
      });

      await tx.supplyRequestItem.createMany({
        data: data.items.map((item) => ({
          supplyRequestId: created.id,
          phanLoai: item.phanLoai,
          tenGoi: item.tenGoi,
          soLuong: item.soLuong,
          donViTinh: item.donViTinh,
        })),
      });

      return tx.supplyRequest.findUnique({
        where: { id: created.id },
        include: {
          employee: {
            include: {
              user: true,
              position: true,
            },
          },
          items: true,
          purchaseRequests: true,
        },
      });
    });

    // Send notification to purchasing department employees
    try {
      const purchasingEmployees = await prisma.employee.findMany({
        where: {
          subDepartment: {
            department: {
              code: 'DEPT_PURCHASING',
            },
          },
        },
        select: { id: true },
      });

      if (purchasingEmployees.length > 0) {
        const itemNames = data.items.map((i) => i.tenGoi).join(', ');
        await notificationService.createSupplyRequestNotifications(
          purchasingEmployees.map((emp) => emp.id),
          NotificationType.SUPPLY_REQUEST,
          'Yêu cầu cung cấp mới',
          `${data.tenNhanVien} (${data.boPhan}) yêu cầu cung cấp: ${itemNames}`,
          supplyRequest?.id
        );
      }
    } catch (error) {
      console.error('Error sending supply request notifications:', error);
    }

    return supplyRequest;
  }

  async updateSupplyRequest(id: string, data: UpdateSupplyRequestRequest) {
    // Check record exists
    const existing = await prisma.supplyRequest.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Supply request not found');
    }

    // Strip trangThai from incoming data — status is server-managed only
    const { items, ...headerData } = data as any;
    delete headerData.trangThai;

    if (items && Array.isArray(items)) {
      // Replace items within a transaction
      await prisma.$transaction(async (tx) => {
        // Delete existing items
        await tx.supplyRequestItem.deleteMany({ where: { supplyRequestId: id } });
        // Create new items
        await tx.supplyRequestItem.createMany({
          data: items.map((item: SupplyRequestItemInput) => ({
            supplyRequestId: id,
            phanLoai: item.phanLoai,
            tenGoi: item.tenGoi,
            soLuong: item.soLuong,
            donViTinh: item.donViTinh,
          })),
        });
        // Update header
        if (Object.keys(headerData).length > 0) {
          await tx.supplyRequest.update({
            where: { id },
            data: headerData,
          });
        }
      });
    } else if (Object.keys(headerData).length > 0) {
      await prisma.supplyRequest.update({
        where: { id },
        data: headerData,
      });
    }

    return prisma.supplyRequest.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: true,
            position: true,
          },
        },
        items: true,
      },
    });
  }

  async deleteSupplyRequest(id: string) {
    await prisma.supplyRequest.delete({
      where: { id },
    });
  }

  /**
   * Advance status only if newStatus comes later in the ordered sequence.
   * Prevents out-of-order transitions.
   */
  private async advanceStatus(supplyRequestId: string, newStatus: string): Promise<void> {
    const request = await prisma.supplyRequest.findUnique({
      where: { id: supplyRequestId },
      select: { trangThai: true },
    });

    if (!request) return;

    const currentIndex = STATUS_SEQUENCE.indexOf(request.trangThai);
    const newIndex = STATUS_SEQUENCE.indexOf(newStatus);

    if (newIndex > currentIndex) {
      await prisma.supplyRequest.update({
        where: { id: supplyRequestId },
        data: { trangThai: newStatus },
      });
    }
  }

  /**
   * Called when a PurchaseRequest is created for this supply request.
   * Advances status to "Đang xử lý" and notifies original requester.
   */
  async onPurchaseRequestCreated(supplyRequestId: string): Promise<void> {
    try {
      await this.advanceStatus(supplyRequestId, 'Đang xử lý');

      const request = await prisma.supplyRequest.findUnique({
        where: { id: supplyRequestId },
        select: { employeeId: true, maYeuCau: true },
      });

      if (request) {
        await notificationService.createSupplyRequestNotification(
          request.employeeId,
          NotificationType.SUPPLY_REQUEST_PROCESSING,
          'Yêu cầu cung cấp đang xử lý',
          `Yêu cầu cung cấp ${request.maYeuCau} của bạn đang được phòng mua hàng xử lý.`,
          supplyRequestId
        );
      }
    } catch (error) {
      console.error('Error in onPurchaseRequestCreated notification:', error);
    }
  }

  /**
   * Called when the linked PurchaseRequest is approved.
   * Advances status to "Đã duyệt mua" and notifies requester + warehouse staff.
   */
  async onPurchaseRequestApproved(supplyRequestId: string): Promise<void> {
    try {
      await this.advanceStatus(supplyRequestId, 'Đã duyệt mua');

      const request = await prisma.supplyRequest.findUnique({
        where: { id: supplyRequestId },
        select: { employeeId: true, maYeuCau: true },
      });

      if (!request) return;

      // Notify original requester
      await notificationService.createSupplyRequestNotification(
        request.employeeId,
        NotificationType.SUPPLY_REQUEST_APPROVED,
        'Yêu cầu cung cấp đã được duyệt mua',
        `Yêu cầu cung cấp ${request.maYeuCau} của bạn đã được duyệt mua hàng.`,
        supplyRequestId
      );

      // Notify warehouse employees
      const warehouseEmployees = await prisma.employee.findMany({
        where: {
          subDepartment: {
            department: {
              code: 'DEPT_WAREHOUSE',
            },
          },
        },
        select: { id: true },
      });

      if (warehouseEmployees.length > 0) {
        await notificationService.createSupplyRequestNotifications(
          warehouseEmployees.map((emp) => emp.id),
          NotificationType.SUPPLY_REQUEST_APPROVED,
          'Hàng hóa sắp nhập kho',
          `Yêu cầu cung cấp ${request.maYeuCau} đã được duyệt mua. Chuẩn bị nhập kho.`,
          supplyRequestId
        );
      }
    } catch (error) {
      console.error('Error in onPurchaseRequestApproved notification:', error);
    }
  }

  /**
   * Called when the linked PurchaseRequest is marked as "Hoàn thành" (goods purchased).
   * Advances status to "Đã mua hàng" and notifies the original requester.
   */
  async onPurchaseRequestCompleted(supplyRequestId: string): Promise<void> {
    try {
      await this.advanceStatus(supplyRequestId, 'Đã mua hàng');

      const request = await prisma.supplyRequest.findUnique({
        where: { id: supplyRequestId },
        select: { employeeId: true, maYeuCau: true },
      });

      if (request) {
        await notificationService.createSupplyRequestNotification(
          request.employeeId,
          NotificationType.SUPPLY_REQUEST_APPROVED,
          'Hàng hóa đã được mua',
          `Yêu cầu cung cấp ${request.maYeuCau} đã được mua hàng xong. Đang chờ nhập kho.`,
          supplyRequestId
        );
      }
    } catch (error) {
      console.error('Error in onPurchaseRequestCompleted notification:', error);
    }
  }

  /**
   * Called when a WarehouseReceipt or WarehouseIssue is created for this supply request.
   * Advances status to "Đã cung cấp" and notifies the original requester.
   */
  async onWarehouseDocumentCreated(supplyRequestId: string): Promise<void> {
    try {
      await this.advanceStatus(supplyRequestId, 'Đã cung cấp');

      const request = await prisma.supplyRequest.findUnique({
        where: { id: supplyRequestId },
        select: { employeeId: true, maYeuCau: true },
      });

      if (request) {
        await notificationService.createSupplyRequestNotification(
          request.employeeId,
          NotificationType.SUPPLY_REQUEST_FULFILLED,
          'Yêu cầu cung cấp đã được thực hiện',
          `Yêu cầu cung cấp ${request.maYeuCau} của bạn đã được cung cấp/nhập kho.`,
          supplyRequestId
        );
      }
    } catch (error) {
      console.error('Error in onWarehouseDocumentCreated notification:', error);
    }
  }

  async exportToExcel(filters?: any): Promise<Buffer> {
    const where: any = {};

    if (filters?.search) {
      where.OR = [
        { maYeuCau: { contains: filters.search, mode: 'insensitive' as const } },
        { tenNhanVien: { contains: filters.search, mode: 'insensitive' as const } },
        { maNhanVien: { contains: filters.search, mode: 'insensitive' as const } },
        {
          items: {
            some: {
              OR: [
                { tenGoi: { contains: filters.search, mode: 'insensitive' as const } },
                { phanLoai: { contains: filters.search, mode: 'insensitive' as const } },
              ],
            },
          },
        },
      ];
    }

    const data = await prisma.supplyRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          include: {
            user: true,
            position: true,
          },
        },
        items: true,
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách yêu cầu cung cấp');

    worksheet.columns = [
      { header: 'Ngày yêu cầu', key: 'ngayYeuCau', width: 15 },
      { header: 'Mã yêu cầu', key: 'maYeuCau', width: 15 },
      { header: 'Nhân viên', key: 'tenNhanVien', width: 25 },
      { header: 'Bộ phận', key: 'boPhan', width: 20 },
      { header: 'Phân loại', key: 'phanLoai', width: 15 },
      { header: 'Tên gọi', key: 'tenGoi', width: 25 },
      { header: 'Số lượng', key: 'soLuong', width: 12 },
      { header: 'Đơn vị tính', key: 'donViTinh', width: 12 },
      { header: 'Mức độ ưu tiên', key: 'mucDoUuTien', width: 15 },
      { header: 'Trạng thái', key: 'trangThai', width: 15 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Emit one row per item
    data.forEach((request) => {
      if (request.items && request.items.length > 0) {
        request.items.forEach((item) => {
          worksheet.addRow({
            ngayYeuCau: new Date(request.ngayYeuCau).toLocaleDateString('vi-VN'),
            maYeuCau: request.maYeuCau,
            tenNhanVien: request.tenNhanVien,
            boPhan: request.boPhan,
            phanLoai: item.phanLoai,
            tenGoi: item.tenGoi,
            soLuong: item.soLuong,
            donViTinh: item.donViTinh,
            mucDoUuTien: request.mucDoUuTien,
            trangThai: request.trangThai,
          });
        });
      } else {
        // Legacy row with no items
        worksheet.addRow({
          ngayYeuCau: new Date(request.createdAt).toLocaleDateString('vi-VN'),
          maYeuCau: request.maYeuCau,
          tenNhanVien: request.tenNhanVien,
          boPhan: request.boPhan,
          phanLoai: '',
          tenGoi: '',
          soLuong: '',
          donViTinh: '',
          mucDoUuTien: request.mucDoUuTien,
          trangThai: request.trangThai,
        });
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }
}

export default new SupplyRequestService();
