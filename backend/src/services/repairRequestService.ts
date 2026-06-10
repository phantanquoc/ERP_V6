import { Prisma } from '@prisma/client';
import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError, ValidationError } from '@utils/errors';
import { nextYearlyCode, yearlyCodeWhere } from '@utils/codeGenerator';
import { NotificationEvent } from '@types';
import notificationService from './notificationService';
import ExcelJS from 'exceljs';

interface RepairRequestItemData {
  machineSystemId?: string;
  machineSystemDetailId?: string;
  machineId?: string;
  tenHeThong: string;
  tinhTrangThietBi: string;
  loaiLoi: string;
  noiDungLoi: string;
}

interface CreateRepairRequestData {
  ngayThang: Date;
  maYeuCau: string;
  // @deprecated — kept for backward compatibility
  tenHeThong?: string;
  // @deprecated — kept for backward compatibility
  tinhTrangThietBi?: string;
  // @deprecated — kept for backward compatibility
  loaiLoi?: string;
  mucDoUuTien: string;
  // @deprecated — kept for backward compatibility
  noiDungLoi?: string;
  ghiChu?: string;
  trangThai?: string;
  fileDinhKem?: string;
  items?: RepairRequestItemData[];
}

interface UpdateRepairRequestData {
  ngayThang?: Date;
  tenHeThong?: string;
  tinhTrangThietBi?: string;
  loaiLoi?: string;
  mucDoUuTien?: string;
  noiDungLoi?: string;
  ghiChu?: string;
  trangThai?: string;
  fileDinhKem?: string;
  items?: RepairRequestItemData[];
}

const repairRequestInclude = {
  acceptanceHandovers: {
    include: {
      items: {
        include: {
          repairRequestItem: true,
          machineSystem: true,
          machineSystemDetail: true,
          machine: { select: { id: true, maMay: true, tenMay: true, trangThai: true } },
        },
      },
    },
  },
  items: {
    include: {
      machineSystem: true,
      machineSystemDetail: true,
      machine: { select: { id: true, maMay: true, tenMay: true, trangThai: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.RepairRequestInclude;

type ResolvedRepairRequestItemData = Omit<RepairRequestItemData, 'machineSystemId' | 'machineSystemDetailId' | 'machineId'> & {
  machineSystemId: string | null;
  machineSystemDetailId: string | null;
  machineId: string | null;
};

class RepairRequestService {
  async generateRepairRequestCode(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await prisma.repairRequest.findFirst({
      where: { maYeuCau: yearlyCodeWhere('YC-SC', year) },
      orderBy: { maYeuCau: 'desc' },
      select: { maYeuCau: true },
    });
    return nextYearlyCode(last?.maYeuCau ?? null, 'YC-SC', year);
  }

  /**
   * Get all repair requests with pagination
   */
  async getAllRepairRequests(page: number = 1, limit: number = 10) {
    const { skip, limit: limitNum } = getPaginationParams(page, limit);

    const [data, total] = await Promise.all([
      prisma.repairRequest.findMany({
        skip,
        take: limitNum,
        orderBy: {
          createdAt: 'desc',
        },
        include: repairRequestInclude,
      }),
      prisma.repairRequest.count(),
    ]);

    return {
      data,
      pagination: {
        page,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Get repair request by ID
   */
  async getRepairRequestById(id: number) {
    const request = await prisma.repairRequest.findUnique({
      where: { id },
      include: repairRequestInclude,
    });

    if (!request) {
      throw new NotFoundError('Không tìm thấy yêu cầu sửa chữa');
    }

    return request;
  }

  private async resolveRepairItems(items: RepairRequestItemData[] = []): Promise<ResolvedRepairRequestItemData[]> {
    return Promise.all(items.map(async (item) => {
      let machineSystem = item.machineSystemId
        ? await prisma.machineSystem.findUnique({ where: { id: item.machineSystemId } })
        : null;

      let machineSystemDetail = item.machineSystemDetailId
        ? await prisma.machineSystemDetail.findUnique({
            where: { id: item.machineSystemDetailId },
            include: { machineSystem: true },
          })
        : null;

      if (item.machineSystemId && !machineSystem) {
        throw new ValidationError('Hệ thống máy không hợp lệ');
      }

      if (item.machineSystemDetailId && !machineSystemDetail) {
        throw new ValidationError('Chi tiết hệ thống máy không hợp lệ');
      }

      if (machineSystemDetail) {
        if (machineSystem && machineSystem.id !== machineSystemDetail.machineSystemId) {
          throw new ValidationError('Chi tiết máy không thuộc hệ thống máy đã chọn');
        }
        machineSystem = machineSystemDetail.machineSystem;
      }

      return {
        ...item,
        machineSystemId: machineSystem?.id ?? null,
        machineSystemDetailId: machineSystemDetail?.id ?? null,
        machineId: item.machineId || null,
        tenHeThong: machineSystem ? machineSystem.tenHeThong : item.tenHeThong,
        tinhTrangThietBi: machineSystemDetail && !item.tinhTrangThietBi
          ? machineSystemDetail.tenChiTiet
          : item.tinhTrangThietBi,
      };
    }));
  }

  /**
   * Create new repair request
   */
  async createRepairRequest(data: CreateRepairRequestData) {
    const resolvedItems = await this.resolveRepairItems(data.items);
    const firstItem = resolvedItems.length > 0 ? resolvedItems[0] : null;

    const request = await prisma.$transaction(async (tx) => {
      const created = await tx.repairRequest.create({
        data: {
          ngayThang: data.ngayThang,
          maYeuCau: data.maYeuCau,
          // Backward compat: store first item's fields on parent
          tenHeThong: firstItem ? firstItem.tenHeThong : (data.tenHeThong ?? null),
          tinhTrangThietBi: firstItem ? firstItem.tinhTrangThietBi : (data.tinhTrangThietBi ?? null),
          loaiLoi: firstItem ? firstItem.loaiLoi : (data.loaiLoi ?? null),
          noiDungLoi: firstItem ? firstItem.noiDungLoi : (data.noiDungLoi ?? null),
          mucDoUuTien: data.mucDoUuTien,
          ghiChu: data.ghiChu,
          trangThai: data.trangThai || 'Chờ xử lý',
          fileDinhKem: data.fileDinhKem,
        },
      });

      if (data.items && data.items.length > 0) {
        await tx.repairRequestItem.createMany({
          data: resolvedItems.map((item) => ({
            repairRequestId: created.id,
            machineSystemId: item.machineSystemId,
            machineSystemDetailId: item.machineSystemDetailId,
            machineId: item.machineId,
            tenHeThong: item.tenHeThong,
            tinhTrangThietBi: item.tinhTrangThietBi,
            loaiLoi: item.loaiLoi,
            noiDungLoi: item.noiDungLoi,
          })),
        });
      }

      return tx.repairRequest.findUnique({
        where: { id: created.id },
        include: repairRequestInclude,
      });
    });

    // Notify quality personnel + admin
    notificationService.notify(NotificationEvent.REPAIR_REQUEST_CREATED, {
      entityId: String(request!.id),
      metadata: {
        maYeuCau: request!.maYeuCau,
        tenHeThong: request!.tenHeThong,
      },
    }).catch(() => {});

    return request;
  }

  /**
   * Update repair request
   */
  async updateRepairRequest(id: number, data: UpdateRepairRequestData) {
    const existing = await this.getRepairRequestById(id);

    const { items, ...scalarData } = data;
    const resolvedItems = items !== undefined ? await this.resolveRepairItems(items) : undefined;

    const updated = await prisma.$transaction(async (tx) => {
      // If items provided, delete-then-recreate
      if (resolvedItems !== undefined) {
        await tx.repairRequestItem.deleteMany({ where: { repairRequestId: id } });

        if (resolvedItems.length > 0) {
          await tx.repairRequestItem.createMany({
            data: resolvedItems.map((item) => ({
              repairRequestId: id,
              machineSystemId: item.machineSystemId,
              machineSystemDetailId: item.machineSystemDetailId,
              machineId: item.machineId,
              tenHeThong: item.tenHeThong,
              tinhTrangThietBi: item.tinhTrangThietBi,
              loaiLoi: item.loaiLoi,
              noiDungLoi: item.noiDungLoi,
            })),
          });

          // Update backward-compat scalar fields from first item
          const firstItem = resolvedItems[0];
          scalarData.tenHeThong = firstItem.tenHeThong;
          scalarData.tinhTrangThietBi = firstItem.tinhTrangThietBi;
          scalarData.loaiLoi = firstItem.loaiLoi;
          scalarData.noiDungLoi = firstItem.noiDungLoi;
        }
      }

      return tx.repairRequest.update({
        where: { id },
        data: scalarData,
        include: repairRequestInclude,
      });
    });

    // Notify if status changed
    if (data.trangThai && data.trangThai !== existing.trangThai) {
      notificationService.notify(NotificationEvent.REPAIR_REQUEST_UPDATED, {
        entityId: String(updated.id),
        metadata: {
          maYeuCau: updated.maYeuCau,
          tenHeThong: updated.tenHeThong,
          status: data.trangThai,
        },
      }).catch(() => {});
    }

    return updated;
  }

  /**
   * Delete repair request
   */
  async deleteRepairRequest(id: number) {
    // Check if exists
    await this.getRepairRequestById(id);

    await prisma.repairRequest.delete({
      where: { id },
    });

    return { message: 'Xóa yêu cầu sửa chữa thành công' };
  }

  /**
   * Export repair requests to Excel
   */
  async exportToExcel(filters?: any): Promise<Buffer> {
    const where: any = {};
    if (filters?.search) {
      where.OR = [
        { maYeuCau: { contains: filters.search, mode: 'insensitive' } },
        { tenHeThong: { contains: filters.search, mode: 'insensitive' } },
        { noiDungLoi: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const data = await prisma.repairRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách yêu cầu sửa chữa');

    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Ngày tháng', key: 'ngayThang', width: 15 },
      { header: 'Mã yêu cầu', key: 'maYeuCau', width: 20 },
      { header: 'Tên hệ thống/thiết bị', key: 'tenHeThong', width: 25 },
      { header: 'Tình trạng thiết bị', key: 'tinhTrangThietBi', width: 20 },
      { header: 'Loại lỗi', key: 'loaiLoi', width: 15 },
      { header: 'Mức độ ưu tiên', key: 'mucDoUuTien', width: 15 },
      { header: 'Nội dung lỗi', key: 'noiDungLoi', width: 30 },
      { header: 'Trạng thái', key: 'trangThai', width: 15 },
      { header: 'Ghi chú', key: 'ghiChu', width: 25 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    let rowIndex = 1;
    data.forEach((request) => {
      const ngayThangStr = request.ngayThang ? new Date(request.ngayThang).toLocaleDateString('vi-VN') : '';
      if (request.items && request.items.length > 0) {
        // One row per item, repeat parent fields
        request.items.forEach((item) => {
          worksheet.addRow({
            stt: rowIndex++,
            ngayThang: ngayThangStr,
            maYeuCau: request.maYeuCau,
            tenHeThong: item.tenHeThong,
            tinhTrangThietBi: item.tinhTrangThietBi,
            loaiLoi: item.loaiLoi,
            mucDoUuTien: request.mucDoUuTien,
            noiDungLoi: item.noiDungLoi,
            trangThai: request.trangThai,
            ghiChu: request.ghiChu || '',
          });
        });
      } else {
        // Fallback to deprecated scalar fields for old records
        worksheet.addRow({
          stt: rowIndex++,
          ngayThang: ngayThangStr,
          maYeuCau: request.maYeuCau,
          tenHeThong: request.tenHeThong,
          tinhTrangThietBi: request.tinhTrangThietBi,
          loaiLoi: request.loaiLoi,
          mucDoUuTien: request.mucDoUuTien,
          noiDungLoi: request.noiDungLoi,
          trangThai: request.trangThai,
          ghiChu: request.ghiChu || '',
        });
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }
}

export default new RepairRequestService();
