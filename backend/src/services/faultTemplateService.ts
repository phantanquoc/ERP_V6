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
  includeSubtree?: boolean;
  orphan?: boolean;
  hoatDongDetail?: boolean;
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

    if (filters.orphan) {
      where.machineSystemDetailId = null;
    } else if (filters.includeSubtree && filters.machineSystemDetailId) {
      const expandedIds = await this.expandSubtreeIds(filters.machineSystemDetailId);
      where.machineSystemDetailId = { in: expandedIds };
    } else if (filters.machineSystemDetailId) {
      where.machineSystemDetailId = filters.machineSystemDetailId;
    }
    if (filters.machineSystemId) where.machineSystemId = filters.machineSystemId;
    if (filters.mucDo) where.mucDo = filters.mucDo;
    if (filters.trangThai) where.trangThai = filters.trangThai;
    if (filters.activeOnly) where.hoatDong = true;
    if (filters.hoatDong !== undefined) where.hoatDong = filters.hoatDong;
    if (filters.hoatDongDetail !== undefined && !filters.orphan) {
      // orphan templates have no detail, so hoatDongDetail filter is N/A when orphan=true
      where.machineSystemDetail = { hoatDong: filters.hoatDongDetail };
    }
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

  private async expandSubtreeIds(detailId: string): Promise<string[]> {
    const detail = await prisma.machineSystemDetail.findUnique({ where: { id: detailId }, select: { machineSystemId: true } });
    if (!detail) return [detailId];
    const all = await prisma.machineSystemDetail.findMany({
      where: { machineSystemId: detail.machineSystemId },
      select: { id: true, parentDetailId: true },
    });
    const childrenMap = new Map<string, string[]>();
    for (const d of all) {
      if (d.parentDetailId) {
        const arr = childrenMap.get(d.parentDetailId) ?? [];
        arr.push(d.id);
        childrenMap.set(d.parentDetailId, arr);
      }
    }
    const result: string[] = [detailId];
    const queue = [detailId];
    const visited = new Set<string>([detailId]);
    while (queue.length) {
      const cur = queue.shift()!;
      for (const child of childrenMap.get(cur) ?? []) {
        if (visited.has(child)) continue;
        visited.add(child);
        result.push(child);
        queue.push(child);
      }
    }
    return result;
  }

  async getTemplateCountsBySystem(machineSystemId: string) {
    const [grouped, details] = await Promise.all([
      prisma.faultTemplate.groupBy({
        by: ['machineSystemDetailId'],
        where: { machineSystemId, machineSystemDetailId: { not: null } },
        _count: { id: true },
      }),
      prisma.machineSystemDetail.findMany({ where: { machineSystemId }, select: { id: true, parentDetailId: true } }),
    ]);
    const directMap = new Map<string, number>();
    for (const g of grouped) {
      if (g.machineSystemDetailId) directMap.set(g.machineSystemDetailId, g._count.id);
    }
    // Build children map
    const childrenMap = new Map<string, string[]>();
    for (const d of details) {
      if (d.parentDetailId) {
        const arr = childrenMap.get(d.parentDetailId) ?? [];
        arr.push(d.id);
        childrenMap.set(d.parentDetailId, arr);
      }
    }
    const subtreeMemo = new Map<string, number>();
    const visiting = new Set<string>();
    const subtree = (id: string): number => {
      if (subtreeMemo.has(id)) return subtreeMemo.get(id)!;
      if (visiting.has(id)) return directMap.get(id) ?? 0; // cycle guard
      visiting.add(id);
      let sum = directMap.get(id) ?? 0;
      for (const child of childrenMap.get(id) ?? []) sum += subtree(child);
      visiting.delete(id);
      subtreeMemo.set(id, sum);
      return sum;
    };
    return details.map((d) => ({
      detailId: d.id,
      directCount: directMap.get(d.id) ?? 0,
      subtreeCount: subtree(d.id),
    }));
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

  // Task 2.3: create with repairSteps in transaction — validate inside tx
  async create(data: CreateFaultTemplateData) {
    const maMauLoi = data.maMauLoi ?? await this.generateTemplateCode();

    return prisma.$transaction(async (tx) => {
      const detail = await this.validateMachineDetail(data.machineSystemDetailId, data.machineSystemId, true, tx);
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

  // Task 2.4: update with delete-then-recreate for repairSteps — validate inside tx
  async update(id: string, data: UpdateFaultTemplateData) {
    const existing = await this.getById(id);

    return prisma.$transaction(async (tx) => {
      let machineSystemId = data.machineSystemId !== undefined ? data.machineSystemId : existing.machineSystemId;
      let machineSystemDetailId = data.machineSystemDetailId !== undefined ? data.machineSystemDetailId : existing.machineSystemDetailId;

      if (data.machineSystemDetailId !== undefined || data.machineSystemId !== undefined) {
        const detail = await this.validateMachineDetail(machineSystemDetailId, machineSystemId, true, tx);
        machineSystemId = detail ? detail.machineSystemId : machineSystemId;
        machineSystemDetailId = detail ? detail.id : null;
      }

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
