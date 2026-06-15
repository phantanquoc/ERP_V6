import { Prisma } from '@prisma/client';
import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError, ValidationError, ConflictError } from '@utils/errors';
import { nextYearlyCode, yearlyCodeWhere } from '@utils/codeGenerator';

interface PlanItemData {
  machineSystemDetailId: string;
  maintenanceTemplateId?: string;
  noiDung: string;
  tanSuat?: string;
  toThucHien?: string;
  soLuong?: number;
  thangBatDau?: number;
}

export interface CreateMaintenancePlanData {
  maKeHoach?: string;
  machineSystemId: string;
  nam: number;
  nguoiLap: string;
  ngayLap?: Date;
  ghiChu?: string;
  trangThai?: string;
  fileDinhKem?: string;
  items: PlanItemData[];
}

export interface UpdateMaintenancePlanData {
  nguoiLap?: string;
  ghiChu?: string;
  trangThai?: string;
  fileDinhKem?: string;
  items?: PlanItemData[];
}

export interface MaintenancePlanFilters {
  page?: number;
  limit?: number;
  machineSystemId?: string;
  nam?: number;
  trangThai?: string;
  search?: string;
}

const planInclude = {
  machineSystem: { select: { id: true, maHeThong: true, tenHeThong: true, khuVuc: true, viTri: true } },
  items: {
    include: {
      machineSystemDetail: { select: { id: true, maChiTiet: true, tenChiTiet: true } },
      maintenanceTemplate: { select: { id: true, noiDung: true } },
      logs: { orderBy: [{ thang: 'asc' as const }, { lanThu: 'asc' as const }] },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  _count: { select: { records: true } },
} satisfies Prisma.MaintenancePlanInclude;

class MaintenancePlanService {
  async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await prisma.maintenancePlan.findFirst({
      where: { maKeHoach: yearlyCodeWhere('KHBD', year) },
      orderBy: { maKeHoach: 'desc' },
      select: { maKeHoach: true },
    });
    return nextYearlyCode(last?.maKeHoach ?? null, 'KHBD', year);
  }

  async list(filters: MaintenancePlanFilters = {}) {
    const page = filters.page ?? 1;
    const { skip, limit } = getPaginationParams(page, filters.limit ?? 10);
    const where: Prisma.MaintenancePlanWhereInput = {};

    if (filters.machineSystemId) where.machineSystemId = filters.machineSystemId;
    if (filters.nam) where.nam = filters.nam;
    if (filters.trangThai) where.trangThai = filters.trangThai;
    if (filters.search) {
      where.OR = [
        { maKeHoach: { contains: filters.search, mode: 'insensitive' } },
        { machineSystem: { tenHeThong: { contains: filters.search, mode: 'insensitive' } } },
        { nguoiLap: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.maintenancePlan.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: planInclude }),
      prisma.maintenancePlan.count({ where }),
    ]);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string) {
    const plan = await prisma.maintenancePlan.findUnique({ where: { id }, include: planInclude });
    if (!plan) throw new NotFoundError('Không tìm thấy kế hoạch bảo dưỡng');
    return plan;
  }

  async create(data: CreateMaintenancePlanData) {
    const existing = await prisma.maintenancePlan.findUnique({
      where: { machineSystemId_nam: { machineSystemId: data.machineSystemId, nam: data.nam } },
    });
    if (existing) throw new ConflictError(`Hệ thống này đã có kế hoạch bảo dưỡng năm ${data.nam}`);

    if (!data.items || data.items.length === 0) {
      throw new ValidationError('Kế hoạch phải có ít nhất 1 nội dung bảo dưỡng');
    }

    const maKeHoach = data.maKeHoach ?? await this.generateCode();

    return prisma.$transaction(async (tx) => {
      const plan = await tx.maintenancePlan.create({
        data: {
          maKeHoach,
          machineSystemId: data.machineSystemId,
          nam: data.nam,
          nguoiLap: data.nguoiLap,
          ngayLap: data.ngayLap ?? new Date(),
          ghiChu: data.ghiChu,
          trangThai: data.trangThai ?? 'Đang thực hiện',
          fileDinhKem: data.fileDinhKem,
        },
      });

      await tx.maintenancePlanItem.createMany({
        data: data.items.map((item) => ({
          maintenancePlanId: plan.id,
          machineSystemDetailId: item.machineSystemDetailId,
          maintenanceTemplateId: item.maintenanceTemplateId || null,
          noiDung: item.noiDung,
          tanSuat: (item.tanSuat as any) || 'BA_THANG',
          toThucHien: (item.toThucHien as any) || 'CO_KHI',
          soLuong: item.soLuong ?? 1,
          thangBatDau: item.thangBatDau ?? 1,
        })),
      });

      return tx.maintenancePlan.findUnique({ where: { id: plan.id }, include: planInclude });
    });
  }

  async update(id: string, data: UpdateMaintenancePlanData) {
    await this.getById(id);

    return prisma.$transaction(async (tx) => {
      await tx.maintenancePlan.update({
        where: { id },
        data: {
          nguoiLap: data.nguoiLap,
          ghiChu: data.ghiChu,
          trangThai: data.trangThai,
          fileDinhKem: data.fileDinhKem,
        },
      });

      if (data.items) {
        await tx.maintenancePlanItem.deleteMany({ where: { maintenancePlanId: id } });
        await tx.maintenancePlanItem.createMany({
          data: data.items.map((item) => ({
            maintenancePlanId: id,
            machineSystemDetailId: item.machineSystemDetailId,
            maintenanceTemplateId: item.maintenanceTemplateId || null,
            noiDung: item.noiDung,
            tanSuat: (item.tanSuat as any) || 'BA_THANG',
            toThucHien: (item.toThucHien as any) || 'CO_KHI',
            soLuong: item.soLuong ?? 1,
            thangBatDau: item.thangBatDau ?? 1,
          })),
        });
      }

      return tx.maintenancePlan.findUnique({ where: { id }, include: planInclude });
    });
  }

  async toggleMonth(planId: string, itemId: string, month: number, lanThu: number = 1, ghiChu?: string, nguoiThucHien?: string) {
    if (month < 1 || month > 12) throw new ValidationError('Tháng phải từ 1-12');
    if (lanThu < 1) throw new ValidationError('Lần thứ phải từ 1 trở lên');

    const item = await prisma.maintenancePlanItem.findFirst({
      where: { id: itemId, maintenancePlanId: planId },
    });
    if (!item) throw new NotFoundError('Không tìm thấy mục bảo dưỡng');

    // Upsert the log entry — toggle hoanThanh
    const existing = await prisma.maintenancePlanItemLog.findUnique({
      where: { maintenancePlanItemId_thang_lanThu: { maintenancePlanItemId: itemId, thang: month, lanThu } },
    });

    if (existing) {
      return prisma.maintenancePlanItemLog.update({
        where: { id: existing.id },
        data: {
          hoanThanh: !existing.hoanThanh,
          ghiChu: ghiChu !== undefined ? ghiChu : existing.ghiChu,
          nguoiThucHien: nguoiThucHien !== undefined ? nguoiThucHien : existing.nguoiThucHien,
          ngayThucHien: !existing.hoanThanh ? new Date() : null,
        },
      });
    }

    return prisma.maintenancePlanItemLog.create({
      data: {
        maintenancePlanItemId: itemId,
        thang: month,
        lanThu,
        hoanThanh: true,
        ghiChu: ghiChu || null,
        nguoiThucHien: nguoiThucHien || null,
        ngayThucHien: new Date(),
      },
    });
  }

  async updateLogNote(logId: string, data: { ghiChu?: string; nguoiThucHien?: string }) {
    const log = await prisma.maintenancePlanItemLog.findUnique({ where: { id: logId } });
    if (!log) throw new NotFoundError('Không tìm thấy log bảo dưỡng');
    const updateData: Record<string, any> = {};
    if (data.ghiChu !== undefined) updateData.ghiChu = data.ghiChu;
    if (data.nguoiThucHien !== undefined) updateData.nguoiThucHien = data.nguoiThucHien;
    return prisma.maintenancePlanItemLog.update({
      where: { id: logId },
      data: updateData,
    });
  }

  async delete(id: string) {
    await this.getById(id);
    return prisma.maintenancePlan.delete({ where: { id } });
  }
}

export default new MaintenancePlanService();

