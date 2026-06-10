import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError, ValidationError } from '@utils/errors';
import { nextYearlyCode, yearlyCodeWhere } from '@utils/codeGenerator';
import ExcelJS from 'exceljs';
import { NotificationEvent } from '@types';
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
  loaiYeuCau?: string;
  soTien?: number;
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
// Mua nhanh skips to Đã mua hàng directly
const MUAN_HANH_STATUS_SEQUENCE = ['Chưa cung cấp', 'Đã mua hàng', 'Đã cung cấp'];

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
            select: {
              id: true,
              employeeCode: true,
              user: {
                select: { firstName: true, lastName: true, email: true },
              },
              position: { select: { name: true } },
            },
          },
          items: true,
          purchaseRequests: { select: { id: true, maYeuCau: true, trangThai: true } },
          warehouseReceipts: { select: { id: true, maPhieuNhap: true } },
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
      const year = new Date().getFullYear();
      const lastRequest = await tx.supplyRequest.findFirst({
        where: { maYeuCau: yearlyCodeWhere('YC-CC', year) },
        orderBy: { maYeuCau: 'desc' },
        select: { maYeuCau: true },
      });
      const maYeuCau = nextYearlyCode(lastRequest?.maYeuCau ?? null, 'YC-CC', year);

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
          loaiYeuCau: data.loaiYeuCau || 'Thường',
          soTien: data.soTien,
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

    // Send notification to warehouse employees
    try {
      const warehouseEmployees = await prisma.employee.findMany({
        where: {
          subDepartment: {
            code: 'SUBDEPT_PRODUCTION_WAREHOUSE',
          },
        },
        select: { id: true },
      });

      if (warehouseEmployees.length > 0) {
        const itemNames = data.items.map((i) => i.tenGoi).join(', ');
        await notificationService.notify(NotificationEvent.SUPPLY_REQUEST_CREATED, {
          entityId: supplyRequest?.id,
          metadata: { employeeName: data.tenNhanVien, department: data.boPhan, itemNames, maYeuCau: supplyRequest?.maYeuCau, supplyRequestId: supplyRequest?.id },
        });
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
   * Mark a "Mua nhanh" supply request as purchased.
   * Advances status directly to "Đã mua hàng", optionally recording soTien.
   */
  async markMuaNhanhAsPurchased(id: string, soTien?: number): Promise<void> {
    const request = await prisma.supplyRequest.findUnique({
      where: { id },
      select: { trangThai: true, loaiYeuCau: true },
    });

    if (!request) {
      throw new NotFoundError('Supply request not found');
    }

    const sequence = request.loaiYeuCau === 'Mua nhanh' ? MUAN_HANH_STATUS_SEQUENCE : STATUS_SEQUENCE;
    const currentIndex = sequence.indexOf(request.trangThai);
    const newIndex = sequence.indexOf('Đã mua hàng');

    if (newIndex > currentIndex) {
      await prisma.supplyRequest.update({
        where: { id },
        data: {
          trangThai: 'Đã mua hàng',
          ...(soTien !== undefined ? { soTien } : {}),
        },
      });
    }
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
        await notificationService.notify(NotificationEvent.SUPPLY_REQUEST_PROCESSING, {
          targetEmployeeIds: [request.employeeId],
          entityId: supplyRequestId,
          metadata: { maYeuCau: request.maYeuCau, supplyRequestId },
        });
      }
    } catch (error) {
      console.error('Error in onPurchaseRequestCreated notification:', error);
    }
  }

  /**
   * Called when the linked PurchaseRequest is approved.
   * Advances status to "Đã duyệt mua" and notifies warehouse + purchasing staff.
   */
  async onPurchaseRequestApproved(supplyRequestId: string): Promise<void> {
    try {
      await this.advanceStatus(supplyRequestId, 'Đã duyệt mua');

      const request = await prisma.supplyRequest.findUnique({
        where: { id: supplyRequestId },
        select: { employeeId: true, maYeuCau: true },
      });

      if (!request) return;

      // Notify warehouse employees
      const warehouseEmployees = await prisma.employee.findMany({
        where: {
          subDepartment: {
            code: 'SUBDEPT_PRODUCTION_WAREHOUSE',
          },
        },
        select: { id: true },
      });

      // Notify purchasing employees
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

      const allRecipientIds = [
        ...new Set([
          ...warehouseEmployees.map((emp) => emp.id),
          ...purchasingEmployees.map((emp) => emp.id),
        ]),
      ];

      if (allRecipientIds.length > 0) {
        await notificationService.notify(NotificationEvent.SUPPLY_REQUEST_APPROVED, {
          targetEmployeeIds: allRecipientIds,
          entityId: supplyRequestId,
          metadata: { maYeuCau: request.maYeuCau, supplyRequestId },
        });
      }
    } catch (error) {
      console.error('Error in onPurchaseRequestApproved notification:', error);
    }
  }

  /**
   * Called when the linked PurchaseRequest is marked as "Hoàn thành" (goods purchased).
   * Advances status to "Đã mua hàng" and notifies warehouse employees.
   */
  async onPurchaseRequestCompleted(supplyRequestId: string): Promise<void> {
    try {
      await this.advanceStatus(supplyRequestId, 'Đã mua hàng');

      const request = await prisma.supplyRequest.findUnique({
        where: { id: supplyRequestId },
        select: { employeeId: true, maYeuCau: true },
      });

      if (request) {
        const warehouseEmployees = await prisma.employee.findMany({
          where: {
            subDepartment: {
              code: 'SUBDEPT_PRODUCTION_WAREHOUSE',
            },
          },
          select: { id: true },
        });

        if (warehouseEmployees.length > 0) {
          await notificationService.notify(NotificationEvent.SUPPLY_REQUEST_APPROVED, {
            targetEmployeeIds: warehouseEmployees.map((emp) => emp.id),
            entityId: supplyRequestId,
            metadata: { maYeuCau: request.maYeuCau, supplyRequestId },
          });
        }
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
        await notificationService.notify(NotificationEvent.SUPPLY_REQUEST_FULFILLED, {
          targetEmployeeIds: [request.employeeId],
          entityId: supplyRequestId,
          metadata: { maYeuCau: request.maYeuCau, supplyRequestId },
        });
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
