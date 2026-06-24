import { Prisma } from '@prisma/client';
import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError, ValidationError } from '@utils/errors';
import { nextYearlyCode, yearlyCodeWhere } from '@utils/codeGenerator';

// Task 2.1: include repairSteps ordered by stepNumber asc
const faultTemplateInclude = {
  machineSystem: true,
  machineSystemDetail: true,
  _count: { select: { faultRecords: true } },
  repairSteps: { orderBy: { stepNumber: 'asc' as const } },
} satisfies Prisma.FaultTemplateInclude;

export interface FaultTemplateFilters {
  page?: number;
  limit?: number;
  search?: string;
  machineSystemId?: string;
  machineSystemDetailId?: string;
  mucDo?: string;
  trangThai?: string;
  hoatDong?: boolean;
  activeOnly?: boolean;
}

export interface RepairStepData {
  moTa: string;
  thoiGianUocTinh?: number | null;
  dungCu?: string | null;
  ghiChu?: string | null;
}

export interface CreateFaultTemplateData {
  maMauLoi?: string;
  tenMauLoi: string;
  moTa: string;
  mucDo: string;
  machineSystemId?: string;
  machineSystemDetailId?: string;
  tenDetailGoiY?: string;
  loaiDetailGoiY?: string;
  hoatDong?: boolean;
  trangThai?: string;
  ghiChu?: string;
  fileDinhKem?: string;
  repairSteps?: RepairStepData[];
}

export type UpdateFaultTemplateData = Partial<CreateFaultTemplateData>;

class FaultTemplateService {
  async generateTemplateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await prisma.faultTemplate.findFirst({
      where: { maMauLoi: yearlyCodeWhere('ML', year) },
      orderBy: { maMauLoi: 'desc' },
      select: { maMauLoi: true },
    });
    return nextYearlyCode(last?.maMauLoi ?? null, 'ML', year);
  }

  private async validateMachineDetail(
    machineSystemDetailId: string | null | undefined,
    machineSystemId?: string | null,
    requireActive = true,
    tx: Prisma.TransactionClient = prisma,
  ) {
    if (!machineSystemDetailId) return null;

    const detail = await tx.machineSystemDetail.findUnique({
      where: { id: machineSystemDetailId },
      include: { machineSystem: true },
    });

    if (!detail) throw new ValidationError('Chi tiết hệ thống máy không hợp lệ');
    if (requireActive && !detail.hoatDong) {
      throw new ValidationError('Chi tiết hệ thống máy đã ngừng hoạt động');
    }
    if (machineSystemId && detail.machineSystemId !== machineSystemId) {
      throw new ValidationError('Chi tiết máy không thuộc hệ thống máy đã chọn');
    }

    return detail;
  }

  async list(filters: FaultTemplateFilters = {}) {
    const page = filters.page ?? 1;
    const { skip, limit } = getPaginationParams(page, filters.limit ?? 10);
    const where: Prisma.FaultTemplateWhereInput = {};

    if (filters.machineSystemId) where.machineSystemId = filters.machineSystemId;
    if (filters.machineSystemDetailId) where.machineSystemDetailId = filters.machineSystemDetailId;
    if (filters.mucDo) where.mucDo = filters.mucDo;
    if (filters.trangThai) where.trangThai = filters.trangThai;
    if (filters.activeOnly) where.hoatDong = true;
    if (filters.hoatDong !== undefined) where.hoatDong = filters.hoatDong;
    if (filters.search) {
      where.OR = [
        { maMauLoi: { contains: filters.search, mode: 'insensitive' } },
        { tenMauLoi: { contains: filters.search, mode: 'insensitive' } },
        { moTa: { contains: filters.search, mode: 'insensitive' } },
        { machineSystem: { maHeThong: { contains: filters.search, mode: 'insensitive' } } },
        { machineSystemDetail: { tenChiTiet: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.faultTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: faultTemplateInclude,
      }),
      prisma.faultTemplate.count({ where }),
    ]);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string) {
    const template = await prisma.faultTemplate.findUnique({ where: { id }, include: faultTemplateInclude });
    if (!template) throw new NotFoundError('Không tìm thấy mẫu lỗi');
    return template;
  }

  // Task 2.2: getSummary method
  async getSummary(id: string) {
    const template = await prisma.faultTemplate.findUnique({
      where: { id },
      select: {
        id: true,
        maMauLoi: true,
        tenMauLoi: true,
        moTa: true,
        mucDo: true,
        hoatDong: true,
        trangThai: true,
        ghiChu: true,
        createdAt: true,
        updatedAt: true,
        repairSteps: { orderBy: { stepNumber: 'asc' } },
      },
    });
    if (!template) throw new NotFoundError('Không tìm thấy mẫu lỗi');

    const [totalRecords, recentRecords] = await Promise.all([
      prisma.faultRecord.count({ where: { faultTemplateId: id } }),
      prisma.faultRecord.findMany({
        where: { faultTemplateId: id },
        orderBy: { ngayPhatHien: 'desc' },
        take: 5,
        select: {
          id: true,
          maLoi: true,
          tenLoi: true,
          mucDo: true,
          trangThai: true,
          ngayPhatHien: true,
          nguoiPhatHien: true,
          machineSystem: { select: { tenHeThong: true, maHeThong: true } },
          machineSystemDetail: { select: { tenChiTiet: true } },
        },
      }),
    ]);

    // Monthly timeline for last 12 months
    const now = new Date();
    const startOf12MonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    type MonthlyRow = { month: string; count: bigint };
    const monthlyRaw = await prisma.$queryRaw<MonthlyRow[]>`
      SELECT TO_CHAR(DATE_TRUNC('month', "ngayPhatHien"), 'YYYY-MM') AS month,
             COUNT(*)::bigint AS count
      FROM "business"."fault_records"
      WHERE "faultTemplateId" = ${id}
        AND "ngayPhatHien" >= ${startOf12MonthsAgo}
      GROUP BY DATE_TRUNC('month', "ngayPhatHien")
      ORDER BY DATE_TRUNC('month', "ngayPhatHien") ASC
    `;

    const monthlyMap = new Map(monthlyRaw.map((r) => [r.month, Number(r.count)]));
    const monthlyTimeline: Array<{ month: string; count: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyTimeline.push({ month: key, count: monthlyMap.get(key) ?? 0 });
    }

    return {
      ...template,
      totalRecords,
      recentRecords,
      monthlyTimeline,
    };
  }

  // Task 2.3: create with repairSteps in transaction
  async create(data: CreateFaultTemplateData) {
    const detail = await this.validateMachineDetail(data.machineSystemDetailId, data.machineSystemId);
    const maMauLoi = data.maMauLoi ?? await this.generateTemplateCode();

    return prisma.$transaction(async (tx) => {
      const template = await tx.faultTemplate.create({
        data: {
          maMauLoi,
          tenMauLoi: data.tenMauLoi,
          moTa: data.moTa,
          mucDo: data.mucDo,
          machineSystemId: detail ? detail.machineSystemId : (data.machineSystemId ?? null),
          machineSystemDetailId: detail ? detail.id : null,
          tenDetailGoiY: data.tenDetailGoiY,
          loaiDetailGoiY: data.loaiDetailGoiY,
          hoatDong: data.hoatDong ?? true,
          trangThai: data.trangThai ?? 'Hoạt động',
          ghiChu: data.ghiChu,
          fileDinhKem: data.fileDinhKem,
        },
      });

      if (data.repairSteps && data.repairSteps.length > 0) {
        await tx.repairStep.createMany({
          data: data.repairSteps.map((step, index) => ({
            faultTemplateId: template.id,
            stepNumber: index + 1,
            moTa: step.moTa,
            thoiGianUocTinh: step.thoiGianUocTinh ?? null,
            dungCu: step.dungCu ?? null,
            ghiChu: step.ghiChu ?? null,
          })),
        });
      }

      return tx.faultTemplate.findUnique({
        where: { id: template.id },
        include: faultTemplateInclude,
      });
    });
  }

  // Task 2.4: update with delete-then-recreate for repairSteps
  async update(id: string, data: UpdateFaultTemplateData) {
    const existing = await this.getById(id);
    let machineSystemId = data.machineSystemId ?? existing.machineSystemId;
    let machineSystemDetailId = data.machineSystemDetailId ?? existing.machineSystemDetailId;

    if (data.machineSystemDetailId || data.machineSystemId) {
      const detail = await this.validateMachineDetail(machineSystemDetailId, machineSystemId);
      machineSystemId = detail ? detail.machineSystemId : machineSystemId;
      machineSystemDetailId = detail ? detail.id : null;
    }

    return prisma.$transaction(async (tx) => {
      await tx.faultTemplate.update({
        where: { id },
        data: {
          maMauLoi: data.maMauLoi,
          tenMauLoi: data.tenMauLoi,
          moTa: data.moTa,
          mucDo: data.mucDo,
          machineSystemId,
          machineSystemDetailId,
          tenDetailGoiY: data.tenDetailGoiY,
          loaiDetailGoiY: data.loaiDetailGoiY,
          hoatDong: data.hoatDong,
          trangThai: data.trangThai,
          ghiChu: data.ghiChu,
          fileDinhKem: data.fileDinhKem,
        },
      });

      if (data.repairSteps !== undefined) {
        await tx.repairStep.deleteMany({ where: { faultTemplateId: id } });
        if (data.repairSteps.length > 0) {
          await tx.repairStep.createMany({
            data: data.repairSteps.map((step, index) => ({
              faultTemplateId: id,
              stepNumber: index + 1,
              moTa: step.moTa,
              thoiGianUocTinh: step.thoiGianUocTinh ?? null,
              dungCu: step.dungCu ?? null,
              ghiChu: step.ghiChu ?? null,
            })),
          });
        }
      }

      return tx.faultTemplate.findUnique({
        where: { id },
        include: faultTemplateInclude,
      });
    });
  }

  async deactivate(id: string) {
    await this.getById(id);
    return prisma.faultTemplate.update({
      where: { id },
      data: { hoatDong: false, trangThai: 'Ngừng hoạt động' },
      include: faultTemplateInclude,
    });
  }

  async delete(id: string) {
    await this.getById(id);
    const referencedRecords = await prisma.faultRecord.count({ where: { faultTemplateId: id } });
    if (referencedRecords > 0) {
      return this.deactivate(id);
    }
    return prisma.faultTemplate.delete({ where: { id } });
  }

}

export default new FaultTemplateService();
