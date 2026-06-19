import { Prisma } from '@prisma/client';
import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError, ValidationError } from '@utils/errors';
import ExcelJS from 'exceljs';

interface AcceptanceHandoverItemRequest {
  repairRequestItemId: string;
  tinhTrangTruocSuaChua: string;
  tinhTrangSauSuaChua: string;
  ghiChu?: string;
}

interface CreateAcceptanceHandoverRequest {
  repairRequestId: number;
  maYeuCauSuaChua: string;
  tenHeThongThietBi: string;
  tinhTrangTruocSuaChua: string;
  tinhTrangSauSuaChua: string;
  nguoiBanGiao: string;
  nguoiNhan: string;
  nguoiNhanId?: string;
  fileDinhKem?: string;
  ghiChu?: string;
  items?: AcceptanceHandoverItemRequest[];
}

interface UpdateAcceptanceHandoverRequest {
  repairRequestId?: number;
  maYeuCauSuaChua?: string;
  tenHeThongThietBi?: string;
  tinhTrangTruocSuaChua?: string;
  tinhTrangSauSuaChua?: string;
  nguoiBanGiao?: string;
  nguoiNhan?: string;
  nguoiNhanId?: string;
  fileDinhKem?: string;
  ghiChu?: string;
  items?: AcceptanceHandoverItemRequest[];
}

const handoverInclude = {
  repairRequest: {
    include: {
      items: {
        include: {
          machineSystem: true,
          machineSystemDetail: true,
        },
      },
    },
  },
  items: {
    include: {
      repairRequestItem: true,
      machineSystem: true,
      machineSystemDetail: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.AcceptanceHandoverInclude;

class AcceptanceHandoverService {
  /**
   * Generate acceptance handover code
   * Format: NT-{SEQUENCE}
   * Example: NT-001, NT-002
   */
  async generateAcceptanceHandoverCode(): Promise<string> {
    const lastHandover = await prisma.acceptanceHandover.findFirst({
      where: {
        maNghiemThu: {
          startsWith: 'NT-',
        },
      },
      orderBy: {
        maNghiemThu: 'desc',
      },
    });

    let sequence = 1;
    if (lastHandover) {
      const lastCode = lastHandover.maNghiemThu;
      const sequenceStr = lastCode.replace('NT-', '');
      if (sequenceStr) {
        sequence = parseInt(sequenceStr, 10) + 1;
      }
    }

    return `NT-${String(sequence).padStart(3, '0')}`;
  }

  async getAllAcceptanceHandovers(page: number = 1, limit: number = 10, search?: string) {
    const { skip, limit: limitNum } = getPaginationParams(page, limit);

    const where: any = {};

    if (search) {
      where.OR = [
        { maNghiemThu: { contains: search, mode: 'insensitive' } },
        { maYeuCauSuaChua: { contains: search, mode: 'insensitive' } },
        { tenHeThongThietBi: { contains: search, mode: 'insensitive' } },
        { nguoiBanGiao: { contains: search, mode: 'insensitive' } },
        { nguoiNhan: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [handovers, total] = await Promise.all([
      prisma.acceptanceHandover.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: handoverInclude,
      }),
      prisma.acceptanceHandover.count({ where }),
    ]);

    return {
      data: handovers,
      pagination: {
        page,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getAcceptanceHandoverById(id: string) {
    const handover = await prisma.acceptanceHandover.findUnique({
      where: { id },
      include: handoverInclude,
    });

    if (!handover) {
      throw new NotFoundError('Không tìm thấy nghiệm thu bàn giao');
    }

    return handover;
  }

  private async resolveHandoverItems(
    repairRequestId: number,
    items: AcceptanceHandoverItemRequest[] = [],
    tx: Prisma.TransactionClient,
  ) {
    if (items.length === 0) return [];

    const repairRequestItems = await tx.repairRequestItem.findMany({
      where: { id: { in: items.map((item) => item.repairRequestItemId) } },
      include: {
        machineSystem: true,
        machineSystemDetail: true,
      },
    });

    const itemById = new Map(repairRequestItems.map((item) => [item.id, item]));

    return items.map((item) => {
      const repairItem = itemById.get(item.repairRequestItemId);
      if (!repairItem) {
        throw new ValidationError('Hạng mục yêu cầu sửa chữa không hợp lệ');
      }
      if (repairItem.repairRequestId !== repairRequestId) {
        throw new ValidationError('Hạng mục nghiệm thu phải thuộc cùng yêu cầu sửa chữa');
      }

      return {
        repairRequestItemId: repairItem.id,
        machineSystemId: repairItem.machineSystemId,
        machineSystemDetailId: repairItem.machineSystemDetailId,
        tenHeThong: repairItem.tenHeThong,
        tenChiTiet: repairItem.machineSystemDetail?.tenChiTiet ?? null,
        tinhTrangTruocSuaChua: item.tinhTrangTruocSuaChua,
        tinhTrangSauSuaChua: item.tinhTrangSauSuaChua,
        ghiChu: item.ghiChu,
      };
    });
  }

  async createAcceptanceHandover(data: CreateAcceptanceHandoverRequest) {
    const maNghiemThu = await this.generateAcceptanceHandoverCode();

    const handover = await prisma.$transaction(async (tx) => {
      const repairRequest = await tx.repairRequest.findUnique({
        where: { id: data.repairRequestId },
        select: { id: true, maYeuCau: true },
      });
      if (!repairRequest) throw new ValidationError('Yêu cầu sửa chữa không hợp lệ');

      const resolvedItems = await this.resolveHandoverItems(data.repairRequestId, data.items, tx);
      const created = await tx.acceptanceHandover.create({
        data: {
          maNghiemThu,
          repairRequestId: repairRequest.id,
          maYeuCauSuaChua: data.maYeuCauSuaChua || repairRequest.maYeuCau,
          tenHeThongThietBi: data.tenHeThongThietBi,
          tinhTrangTruocSuaChua: data.tinhTrangTruocSuaChua,
          tinhTrangSauSuaChua: data.tinhTrangSauSuaChua,
          nguoiBanGiao: data.nguoiBanGiao,
          nguoiNhan: data.nguoiNhan,
          nguoiNhanId: data.nguoiNhanId,
          fileDinhKem: data.fileDinhKem,
          ghiChu: data.ghiChu,
        },
      });

      if (resolvedItems.length > 0) {
        await tx.acceptanceHandoverItem.createMany({
          data: resolvedItems.map((item) => ({
            acceptanceHandoverId: created.id,
            ...item,
          })),
        });
      }

      const handoverWithItems = await tx.acceptanceHandover.findUnique({ where: { id: created.id }, include: handoverInclude });
      if (!handoverWithItems) throw new NotFoundError('Không tìm thấy nghiệm thu bàn giao');
      return handoverWithItems;
    });

    return handover;
  }

  async getGeneratedCode() {
    return this.generateAcceptanceHandoverCode();
  }

  async updateAcceptanceHandover(id: string, data: UpdateAcceptanceHandoverRequest) {
    const existingHandover = await prisma.acceptanceHandover.findUnique({
      where: { id },
    });

    if (!existingHandover) {
      throw new NotFoundError('Không tìm thấy nghiệm thu bàn giao');
    }

    const { items, ...scalarData } = data;

    const handover = await prisma.$transaction(async (tx) => {
      const repairRequestId = scalarData.repairRequestId ?? existingHandover.repairRequestId;
      if (scalarData.repairRequestId) {
        const repairRequest = await tx.repairRequest.findUnique({
          where: { id: scalarData.repairRequestId },
          select: { id: true },
        });
        if (!repairRequest) throw new ValidationError('Yêu cầu sửa chữa không hợp lệ');
      }

      if (items !== undefined) {
        const resolvedItems = await this.resolveHandoverItems(repairRequestId, items, tx);
        await tx.acceptanceHandoverItem.deleteMany({ where: { acceptanceHandoverId: id } });
        if (resolvedItems.length > 0) {
          await tx.acceptanceHandoverItem.createMany({
            data: resolvedItems.map((item) => ({
              acceptanceHandoverId: id,
              ...item,
            })),
          });
        }
      }

      return tx.acceptanceHandover.update({
        where: { id },
        data: scalarData,
        include: handoverInclude,
      });
    });

    return handover;
  }

  async deleteAcceptanceHandover(id: string) {
    const existingHandover = await prisma.acceptanceHandover.findUnique({
      where: { id },
    });

    if (!existingHandover) {
      throw new NotFoundError('Không tìm thấy nghiệm thu bàn giao');
    }

    await prisma.acceptanceHandover.delete({
      where: { id },
    });

    return { message: 'Xóa nghiệm thu bàn giao thành công' };
  }

  async exportToExcel(filters?: any): Promise<Buffer> {
    const where: any = {};
    if (filters?.search) {
      where.OR = [
        { maNghiemThu: { contains: filters.search, mode: 'insensitive' } },
        { maYeuCauSuaChua: { contains: filters.search, mode: 'insensitive' } },
        { tenHeThongThietBi: { contains: filters.search, mode: 'insensitive' } },
        { nguoiBanGiao: { contains: filters.search, mode: 'insensitive' } },
        { nguoiNhan: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const data = await prisma.acceptanceHandover.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách nghiệm thu bàn giao');

    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Mã nghiệm thu', key: 'maNghiemThu', width: 18 },
      { header: 'Mã yêu cầu sửa chữa', key: 'maYeuCauSuaChua', width: 22 },
      { header: 'Tên hệ thống/thiết bị', key: 'tenHeThongThietBi', width: 25 },
      { header: 'Tình trạng trước sửa chữa', key: 'tinhTrangTruocSuaChua', width: 25 },
      { header: 'Tình trạng sau sửa chữa', key: 'tinhTrangSauSuaChua', width: 25 },
      { header: 'Người bàn giao', key: 'nguoiBanGiao', width: 20 },
      { header: 'Người nhận', key: 'nguoiNhan', width: 20 },
      { header: 'Ghi chú', key: 'ghiChu', width: 25 },
      { header: 'Ngày tạo', key: 'createdAt', width: 15 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    data.forEach((item, index) => {
      worksheet.addRow({
        stt: index + 1,
        maNghiemThu: item.maNghiemThu,
        maYeuCauSuaChua: item.maYeuCauSuaChua,
        tenHeThongThietBi: item.tenHeThongThietBi,
        tinhTrangTruocSuaChua: item.tinhTrangTruocSuaChua,
        tinhTrangSauSuaChua: item.tinhTrangSauSuaChua,
        nguoiBanGiao: item.nguoiBanGiao,
        nguoiNhan: item.nguoiNhan,
        ghiChu: item.ghiChu || '',
        createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }
}

export default new AcceptanceHandoverService();
