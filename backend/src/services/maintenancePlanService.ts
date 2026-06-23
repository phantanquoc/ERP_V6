import { Prisma } from '@prisma/client';
import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError, ValidationError, ConflictError } from '@utils/errors';
import { nextYearlyCode, yearlyCodeWhere } from '@utils/codeGenerator';

const FREQUENCY_TIMES: Record<string, number> = {
  HANG_NGAY: 22,
  HANG_TUAN: 4,
  HANG_THANG: 1,
  HAI_THANG: 1,
  BA_THANG: 1,
  SAU_THANG: 1,
  HANG_NAM: 1,
  KHONG_CO_DINH: 0,
};

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
  items?: PlanItemData[];
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
      machineSystemDetail: { select: { id: true, maChiTiet: true, tenChiTiet: true, hoatDong: true, parentDetailId: true, loaiChiTiet: true } },
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

    // Resolve items: if not provided or empty, auto-populate from MachineSystemDetail
    let resolvedItems: PlanItemData[];
    if (!data.items || data.items.length === 0) {
      const allDetails = await prisma.machineSystemDetail.findMany({
        where: { machineSystemId: data.machineSystemId },
        select: { id: true },
      });
      resolvedItems = allDetails.map((d) => ({
        machineSystemDetailId: d.id,
        noiDung: '',
        tanSuat: 'BA_THANG',
        toThucHien: 'CO_KHI',
        soLuong: 1,
        thangBatDau: 1,
      }));
    } else {
      resolvedItems = data.items;
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

      if (resolvedItems.length > 0) {
        await tx.maintenancePlanItem.createMany({
          data: resolvedItems.map((item) => ({
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
      }

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
      include: { maintenancePlan: { select: { machineSystemId: true } } },
    });
    if (!item) throw new NotFoundError('Không tìm thấy mục bảo dưỡng');

    const existing = await prisma.maintenancePlanItemLog.findUnique({
      where: { maintenancePlanItemId_thang_lanThu: { maintenancePlanItemId: itemId, thang: month, lanThu } },
    });

    let log;
    if (existing) {
      const newHoanThanh = !existing.hoanThanh;
      log = await prisma.maintenancePlanItemLog.update({
        where: { id: existing.id },
        data: {
          hoanThanh: newHoanThanh,
          ghiChu: ghiChu !== undefined ? ghiChu : existing.ghiChu,
          nguoiThucHien: nguoiThucHien !== undefined ? nguoiThucHien : existing.nguoiThucHien,
          ngayThucHien: newHoanThanh ? new Date() : null,
        },
      });

      if (newHoanThanh) {
        await this.createAutoRecord(item, log);
      } else {
        await this.deleteAutoRecord(log.id);
      }
    } else {
      log = await prisma.maintenancePlanItemLog.create({
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

      await this.createAutoRecord(item, log);
    }

    // Auto status transition
    await this.checkAndUpdatePlanStatus(planId);

    return log;
  }

  private async checkAndUpdatePlanStatus(planId: string) {
    try {
      const plan = await prisma.maintenancePlan.findUnique({
        where: { id: planId },
        include: {
          items: { include: { logs: true } },
        },
      });
      if (!plan) return;

      let totalExpected = 0;
      let totalCompleted = 0;

      for (const item of plan.items) {
        // KHONG_CO_DINH items do not count toward plan progress
        if ((item.tanSuat as string) === 'KHONG_CO_DINH') continue;
        const applicableMonths = this.getApplicableMonths(item.tanSuat, item.thangBatDau ?? 1);
        const timesPerMonth = FREQUENCY_TIMES[item.tanSuat] ?? 1;
        totalExpected += applicableMonths.length * timesPerMonth;
        totalCompleted += (item.logs ?? []).filter((l) => l.hoanThanh).length;
      }

      if (totalExpected > 0 && totalCompleted >= totalExpected && plan.trangThai !== 'Hoàn thành') {
        await prisma.maintenancePlan.update({
          where: { id: planId },
          data: { trangThai: 'Hoàn thành' },
        });
      } else if (totalCompleted < totalExpected && plan.trangThai === 'Hoàn thành') {
        await prisma.maintenancePlan.update({
          where: { id: planId },
          data: { trangThai: 'Đang thực hiện' },
        });
      }
    } catch (_) {
      // Status transition must not fail the toggle operation
    }
  }

  private getApplicableMonths(frequency: string, thangBatDau: number): number[] {
    switch (frequency) {
      case 'HAI_THANG': { const m: number[] = []; for (let i = thangBatDau; i <= 12; i += 2) m.push(i); return m; }
      case 'BA_THANG': { const m: number[] = []; for (let i = thangBatDau; i <= 12; i += 3) m.push(i); return m; }
      case 'SAU_THANG': { const m: number[] = []; for (let i = thangBatDau; i <= 12; i += 6) m.push(i); return m; }
      case 'HANG_NAM': return [thangBatDau];
      case 'KHONG_CO_DINH': return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      default: return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    }
  }

  private async createAutoRecord(
    item: { id: string; maintenancePlanId: string; machineSystemDetailId: string; noiDung: string; maintenancePlan: { machineSystemId: string } },
    log: { id: string; nguoiThucHien: string | null; ngayThucHien: Date | null },
  ) {
    try {
      const year = new Date().getFullYear();
      const last = await prisma.maintenanceRecord.findFirst({
        where: { maBienBan: yearlyCodeWhere('BBBD', year) },
        orderBy: { maBienBan: 'desc' },
        select: { maBienBan: true },
      });
      const maBienBan = nextYearlyCode(last?.maBienBan ?? null, 'BBBD', year);

      await prisma.maintenanceRecord.create({
        data: {
          maBienBan,
          maintenancePlanId: item.maintenancePlanId,
          machineSystemId: item.maintenancePlan.machineSystemId,
          machineSystemDetailId: item.machineSystemDetailId,
          loai: 'Bảo dưỡng',
          noiDung: item.noiDung,
          tinhTrangTruoc: '(Chưa cập nhật)',
          tinhTrangSau: '(Chưa cập nhật)',
          nguoiThucHien: log.nguoiThucHien || 'Chưa xác định',
          ngayThucHien: log.ngayThucHien || new Date(),
          sourceLogId: log.id,
        },
      });
    } catch (_) {
      // Auto-record creation must not fail the toggle operation
    }
  }

  private async deleteAutoRecord(logId: string) {
    try {
      await prisma.maintenanceRecord.deleteMany({ where: { sourceLogId: logId } });
    } catch (_) {
      // Cleanup failure must not fail the toggle operation
    }
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

  async syncDetails(planId: string) {
    const plan = await this.getById(planId);

    // Get all current details for the system
    const allDetails = await prisma.machineSystemDetail.findMany({
      where: { machineSystemId: plan.machineSystemId },
      select: { id: true },
    });

    // Get existing item detail IDs
    const existingDetailIds = new Set(
      (plan.items ?? []).map((item: any) => item.machineSystemDetailId),
    );

    // Find missing details
    const missingDetails = allDetails.filter((d) => !existingDetailIds.has(d.id));

    if (missingDetails.length === 0) return plan;

    // Add missing items
    await prisma.maintenancePlanItem.createMany({
      data: missingDetails.map((d) => ({
        maintenancePlanId: planId,
        machineSystemDetailId: d.id,
        noiDung: '',
        tanSuat: 'BA_THANG' as any,
        toThucHien: 'CO_KHI' as any,
        soLuong: 1,
        thangBatDau: 1,
      })),
    });

    return this.getById(planId);
  }

  async delete(id: string) {
    await this.getById(id);
    return prisma.maintenancePlan.delete({ where: { id } });
  }
}

export default new MaintenancePlanService();

