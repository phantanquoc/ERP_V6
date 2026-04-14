import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError, ValidationError } from '@utils/errors';
import ExcelJS from 'exceljs';
import supplyRequestService from './supplyRequestService';
import notificationService from './notificationService';
import { NotificationType } from '@types';

interface PurchaseRequestItemInput {
  phanLoai: string;
  tenHangHoa: string;
  soLuong: number;
  donViTinh: string;
  nhaCungCapId?: string;
  giaDuKien?: number;
}

interface CreatePurchaseRequestRequest {
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  items: PurchaseRequestItemInput[];
  mucDichYeuCau: string;
  mucDoUuTien: string;
  ghiChu?: string;
  fileKemTheo?: string;
  supplyRequestId?: string;
  nhaCungCapId?: string;
  giaDuKien?: number;
  ghiChuMuaHang?: string;
}

class PurchaseRequestService {
  private async generatePurchaseRequestCode(): Promise<string> {
    const lastRequest = await prisma.purchaseRequest.findFirst({
      where: {
        maYeuCau: {
          startsWith: 'YC-MH',
        },
      },
      orderBy: {
        maYeuCau: 'desc',
      },
    });

    let sequence = 1;
    if (lastRequest) {
      const lastCode = lastRequest.maYeuCau;
      const sequenceStr = lastCode.replace('YC-MH', '');
      if (sequenceStr) {
        sequence = parseInt(sequenceStr, 10) + 1;
      }
    }

    return `YC-MH${String(sequence).padStart(4, '0')}`;
  }

  async getAllPurchaseRequests(page: number = 1, limit: number = 10, search?: string) {
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
                    { tenHangHoa: { contains: search, mode: 'insensitive' as const } },
                    { phanLoai: { contains: search, mode: 'insensitive' as const } },
                  ],
                },
              },
            },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      prisma.purchaseRequest.findMany({
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
          supplyRequest: true,
          supplier: true,
          items: { include: { supplier: true } },
        },
      }),
      prisma.purchaseRequest.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPurchaseRequestById(id: string) {
    const request = await prisma.purchaseRequest.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: true,
            position: true,
          },
        },
        supplyRequest: true,
        supplier: true,
        items: { include: { supplier: true } },
      },
    });

    if (!request) {
      throw new NotFoundError('Không tìm thấy yêu cầu mua hàng');
    }

    return request;
  }

  async createPurchaseRequest(data: CreatePurchaseRequestRequest) {
    if (!data.items || data.items.length === 0) {
      throw new ValidationError('Vui lòng thêm ít nhất một sản phẩm');
    }

    const maYeuCau = await this.generatePurchaseRequestCode();

    const purchaseRequest = await prisma.$transaction(async (tx) => {
      const created = await tx.purchaseRequest.create({
        data: {
          maYeuCau,
          employeeId: data.employeeId,
          maNhanVien: data.maNhanVien,
          tenNhanVien: data.tenNhanVien,
          mucDichYeuCau: data.mucDichYeuCau,
          mucDoUuTien: data.mucDoUuTien,
          ghiChu: data.ghiChu,
          fileKemTheo: data.fileKemTheo,
          supplyRequestId: data.supplyRequestId,
          nhaCungCapId: data.nhaCungCapId,
          giaDuKien: data.giaDuKien,
          ghiChuMuaHang: data.ghiChuMuaHang,
        },
      });

      if (data.items && data.items.length > 0) {
        await tx.purchaseRequestItem.createMany({
          data: data.items.map((item) => ({
            purchaseRequestId: created.id,
            phanLoai: item.phanLoai,
            tenHangHoa: item.tenHangHoa,
            soLuong: item.soLuong,
            donViTinh: item.donViTinh,
            nhaCungCapId: item.nhaCungCapId || null,
            giaDuKien: item.giaDuKien ?? null,
          })),
        });
      }

      return tx.purchaseRequest.findUnique({
        where: { id: created.id },
        include: {
          employee: {
            include: {
              user: true,
              position: true,
            },
          },
          supplyRequest: true,
          supplier: true,
          items: { include: { supplier: true } },
        },
      });
    });

    // Trigger supply request status advancement
    if (data.supplyRequestId) {
      try {
        await supplyRequestService.onPurchaseRequestCreated(data.supplyRequestId);
      } catch (hookError) {
        console.error('Error in onPurchaseRequestCreated hook:', hookError);
      }
    }

    // Send notification to admin users about the new purchase request
    try {
      const adminEmployees = await prisma.employee.findMany({
        where: {
          user: {
            role: 'ADMIN',
          },
        },
        select: { id: true },
      });

      const itemNames = data.items.map((i) => i.tenHangHoa).join(', ');
      const allRecipients = [...adminEmployees.map((e) => e.id)];

      if (allRecipients.length > 0) {
        await notificationService.createSupplyRequestNotifications(
          allRecipients,
          NotificationType.SUPPLY_REQUEST,
          'Yêu cầu mua hàng mới',
          `${data.tenNhanVien} tạo yêu cầu mua hàng ${maYeuCau}: ${itemNames}`,
          data.supplyRequestId || undefined
        );
      }
    } catch (notifError) {
      console.error('Error sending purchase request notifications:', notifError);
    }

    return purchaseRequest;
  }

  async getGeneratedCode() {
    return this.generatePurchaseRequestCode();
  }

  async updatePurchaseRequest(id: string, data: {
    phanLoai?: string;
    tenHangHoa?: string;
    soLuong?: number | string;
    donViTinh?: string;
    mucDichYeuCau?: string;
    mucDoUuTien?: string;
    ghiChu?: string;
    fileKemTheo?: string;
    trangThai?: string;
    nguoiDuyet?: string;
    ngayDuyet?: string;
    nhaCungCapId?: string;
    giaDuKien?: number;
    ghiChuMuaHang?: string;
    items?: PurchaseRequestItemInput[];
  }) {
    const existingRequest = await prisma.purchaseRequest.findUnique({
      where: { id },
      include: { supplyRequest: true },
    });

    if (!existingRequest) {
      throw new NotFoundError('Không tìm thấy yêu cầu mua hàng');
    }

    // Parse soLuong to float if it's a string (from FormData)
    const { items, ...updateData } = data as any;
    if (updateData.soLuong !== undefined) {
      updateData.soLuong = parseFloat(updateData.soLuong.toString());
    }
    if (updateData.ngayDuyet) {
      updateData.ngayDuyet = new Date(updateData.ngayDuyet);
    }

    let purchaseRequest;

    if (items && Array.isArray(items)) {
      purchaseRequest = await prisma.$transaction(async (tx) => {
        await tx.purchaseRequestItem.deleteMany({ where: { purchaseRequestId: id } });
        await tx.purchaseRequestItem.createMany({
          data: items.map((item: PurchaseRequestItemInput) => ({
            purchaseRequestId: id,
            phanLoai: item.phanLoai,
            tenHangHoa: item.tenHangHoa,
            soLuong: item.soLuong,
            donViTinh: item.donViTinh,
            nhaCungCapId: item.nhaCungCapId || null,
            giaDuKien: item.giaDuKien ?? null,
          })),
        });
        return tx.purchaseRequest.update({
          where: { id },
          data: updateData,
          include: {
            employee: { include: { user: true, position: true } },
            supplyRequest: true,
            supplier: true,
            items: { include: { supplier: true } },
          },
        });
      });
    } else {
      purchaseRequest = await prisma.purchaseRequest.update({
        where: { id },
        data: updateData,
        include: {
          employee: { include: { user: true, position: true } },
          supplyRequest: true,
          supplier: true,
          items: { include: { supplier: true } },
        },
      });
    }

    // Trigger supply request status advancement when purchase request is approved
    if (
      updateData.trangThai === 'Đã duyệt' &&
      existingRequest.supplyRequestId
    ) {
      try {
        await supplyRequestService.onPurchaseRequestApproved(existingRequest.supplyRequestId);
      } catch (hookError) {
        console.error('Error in onPurchaseRequestApproved hook:', hookError);
      }
    }

    // Notify warehouse when purchasing marks as "Hoàn thành" (goods purchased, ready for intake)
    if (updateData.trangThai === 'Hoàn thành') {
      // Advance supply request status to "Đã mua hàng"
      if (existingRequest.supplyRequestId) {
        try {
          await supplyRequestService.onPurchaseRequestCompleted(existingRequest.supplyRequestId);
        } catch (hookError) {
          console.error('Error in onPurchaseRequestCompleted hook:', hookError);
        }
      }

      try {
        const warehouseEmployees = await prisma.employee.findMany({
          where: {
            subDepartment: {
              department: {
                code: { in: ['DEPT_WAREHOUSE', 'DEPT_PRODUCTION'] },
              },
            },
          },
          select: { id: true },
        });

        const requestDetail = await prisma.purchaseRequest.findUnique({
          where: { id },
          include: { items: true },
        });

        if (warehouseEmployees.length > 0 && requestDetail) {
          const itemNames = requestDetail.items.map((i) => i.tenHangHoa).join(', ');
          await notificationService.createSupplyRequestNotifications(
            warehouseEmployees.map((emp) => emp.id),
            NotificationType.SUPPLY_REQUEST_APPROVED,
            'Hàng hóa đã mua về - Chuẩn bị nhập kho',
            `Yêu cầu mua hàng ${requestDetail.maYeuCau} đã hoàn thành. Hàng: ${itemNames}. Vui lòng tiến hành nhập kho.`,
            existingRequest.supplyRequestId || undefined
          );
        }
      } catch (notifError) {
        console.error('Error sending warehouse notification:', notifError);
      }
    }

    return purchaseRequest;
  }

  async deletePurchaseRequest(id: string) {
    const existingRequest = await prisma.purchaseRequest.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      throw new NotFoundError('Không tìm thấy yêu cầu mua hàng');
    }

    await prisma.purchaseRequest.delete({
      where: { id },
    });

    return { message: 'Xóa yêu cầu mua hàng thành công' };
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
                { tenHangHoa: { contains: filters.search, mode: 'insensitive' as const } },
                { phanLoai: { contains: filters.search, mode: 'insensitive' as const } },
              ],
            },
          },
        },
      ];
    }

    const data = await prisma.purchaseRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          include: {
            user: true,
            position: true,
          },
        },
        supplyRequest: true,
        items: { include: { supplier: true } },
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách yêu cầu mua hàng');

    worksheet.columns = [
      { header: 'Ngày yêu cầu', key: 'ngayYeuCau', width: 15 },
      { header: 'Mã yêu cầu', key: 'maYeuCau', width: 15 },
      { header: 'Nhân viên', key: 'tenNhanVien', width: 25 },
      { header: 'Phân loại', key: 'phanLoai', width: 15 },
      { header: 'Tên hàng hóa', key: 'tenHangHoa', width: 25 },
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

    data.forEach((request) => {
      if (request.items && request.items.length > 0) {
        request.items.forEach((item) => {
          worksheet.addRow({
            ngayYeuCau: new Date(request.createdAt).toLocaleDateString('vi-VN'),
            maYeuCau: request.maYeuCau,
            tenNhanVien: request.tenNhanVien,
            phanLoai: item.phanLoai,
            tenHangHoa: item.tenHangHoa,
            soLuong: item.soLuong,
            donViTinh: item.donViTinh,
            mucDoUuTien: request.mucDoUuTien,
            trangThai: request.trangThai,
          });
        });
      } else {
        worksheet.addRow({
          ngayYeuCau: new Date(request.createdAt).toLocaleDateString('vi-VN'),
          maYeuCau: request.maYeuCau,
          tenNhanVien: request.tenNhanVien,
          phanLoai: '',
          tenHangHoa: '',
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

export default new PurchaseRequestService();
