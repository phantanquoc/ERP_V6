import { Prisma } from '@prisma/client';
import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError, ValidationError, ConflictError } from '@utils/errors';
import { nextYearlyCode, yearlyCodeWhere } from '@utils/codeGenerator';
import ExcelJS from 'exceljs';

export interface MaintenanceRecordFilters {
  page?: number;
  limit?: number;
  machineSystemId?: string;
  machineSystemDetailId?: string;
  loai?: string;
  maintenancePlanId?: string;
  sourceLogId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface CreateMaintenanceRecordData {
  maBienBan?: string;
  maintenancePlanId?: string;
  machineSystemId: string;
  machineSystemDetailId: string;
  loai: string;
  noiDung: string;
  tinhTrangTruoc: string;
  tinhTrangSau: string;
  deXuat?: string;
  thoiGianThucHien?: string;
  ngayThucHien: Date;
  nguoiThucHien: string;
  nguoiPhu?: string[];
  fileDinhKem?: string;
  userId?: string;
}

export type UpdateMaintenanceRecordData = Partial<CreateMaintenanceRecordData>;

const recordInclude = {
  machineSystem: { select: { id: true, maHeThong: true, tenHeThong: true, khuVuc: true } },
  machineSystemDetail: { select: { id: true, maChiTiet: true, tenChiTiet: true } },
  maintenancePlan: { select: { id: true, maKeHoach: true } },
} satisfies Prisma.MaintenanceRecordInclude;

class MaintenanceRecordService {
  async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await prisma.maintenanceRecord.findFirst({
      where: { maBienBan: yearlyCodeWhere('BBBD', year) },
      orderBy: { maBienBan: 'desc' },
      select: { maBienBan: true },
    });
    return nextYearlyCode(last?.maBienBan ?? null, 'BBBD', year);
  }

  async list(filters: MaintenanceRecordFilters = {}) {
    const page = filters.page ?? 1;
    const { skip, limit } = getPaginationParams(page, filters.limit ?? 10);
    const where: Prisma.MaintenanceRecordWhereInput = {};

    if (filters.machineSystemId) where.machineSystemId = filters.machineSystemId;
    if (filters.machineSystemDetailId) where.machineSystemDetailId = filters.machineSystemDetailId;
    if (filters.loai) where.loai = filters.loai;
    if (filters.maintenancePlanId) where.maintenancePlanId = filters.maintenancePlanId;
    if (filters.sourceLogId) where.sourceLogId = filters.sourceLogId;
    if (filters.startDate || filters.endDate) {
      where.ngayThucHien = {};
      if (filters.startDate) where.ngayThucHien.gte = new Date(filters.startDate);
      if (filters.endDate) where.ngayThucHien.lte = new Date(filters.endDate);
    }
    if (filters.search) {
      // Raw SQL pre-query for partial + case-insensitive match on TEXT[] column nguoiPhu
      const term = `%${filters.search}%`;
      const nguoiPhuRows = await prisma.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`SELECT id FROM "business"."maintenance_records" WHERE EXISTS (SELECT 1 FROM unnest("nguoiPhu") AS np WHERE np ILIKE ${term})`
      );
      const nguoiPhuMatchIds = nguoiPhuRows.map((r) => r.id);

      where.OR = [
        { maBienBan: { contains: filters.search, mode: 'insensitive' } },
        { noiDung: { contains: filters.search, mode: 'insensitive' } },
        { nguoiThucHien: { contains: filters.search, mode: 'insensitive' } },
        ...(nguoiPhuMatchIds.length > 0 ? [{ id: { in: nguoiPhuMatchIds } }] : []),
        { machineSystemDetail: { tenChiTiet: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.maintenanceRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { ngayThucHien: 'desc' },
        include: recordInclude,
      }),
      prisma.maintenanceRecord.count({ where }),
    ]);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string) {
    const record = await prisma.maintenanceRecord.findUnique({
      where: { id },
      include: recordInclude,
    });
    if (!record) throw new NotFoundError('Không tìm thấy biên bản bảo dưỡng');
    return record;
  }

  async create(data: CreateMaintenanceRecordData) {
    if (!['Bảo dưỡng', 'Sửa chữa'].includes(data.loai)) {
      throw new ValidationError('Loại phải là "Bảo dưỡng" hoặc "Sửa chữa"');
    }
    const maBienBan = data.maBienBan ?? (await this.generateCode());

    return prisma.maintenanceRecord.create({
      data: {
        maBienBan,
        maintenancePlanId: data.maintenancePlanId || null,
        machineSystemId: data.machineSystemId,
        machineSystemDetailId: data.machineSystemDetailId,
        loai: data.loai,
        noiDung: data.noiDung,
        tinhTrangTruoc: data.tinhTrangTruoc,
        tinhTrangSau: data.tinhTrangSau,
        deXuat: data.deXuat,
        thoiGianThucHien: data.thoiGianThucHien,
        ngayThucHien: new Date(data.ngayThucHien),
        nguoiThucHien: data.nguoiThucHien,
        nguoiPhu: data.nguoiPhu ?? [],
        fileDinhKem: data.fileDinhKem,
        createdById: data.userId ?? null,
      },
      include: recordInclude,
    });
  }

  async update(id: string, data: UpdateMaintenanceRecordData) {
    await this.getById(id);
    if (data.loai && !['Bảo dưỡng', 'Sửa chữa'].includes(data.loai)) {
      throw new ValidationError('Loại phải là "Bảo dưỡng" hoặc "Sửa chữa"');
    }

    return prisma.maintenanceRecord.update({
      where: { id },
      data: {
        maintenancePlanId: data.maintenancePlanId,
        machineSystemId: data.machineSystemId,
        machineSystemDetailId: data.machineSystemDetailId,
        loai: data.loai,
        noiDung: data.noiDung,
        tinhTrangTruoc: data.tinhTrangTruoc,
        tinhTrangSau: data.tinhTrangSau,
        deXuat: data.deXuat,
        thoiGianThucHien: data.thoiGianThucHien,
        ngayThucHien: data.ngayThucHien ? new Date(data.ngayThucHien) : undefined,
        nguoiThucHien: data.nguoiThucHien,
        nguoiPhu: data.nguoiPhu,
        fileDinhKem: data.fileDinhKem,
      },
      include: recordInclude,
    });
  }

  async delete(id: string) {
    const rec = await this.getById(id);
    if ((rec as unknown as { sourceLogId: string | null }).sourceLogId != null) {
      throw new ValidationError('Biên bản tự sinh chỉ được xóa bằng cách bỏ tick trong kế hoạch');
    }
    return prisma.maintenanceRecord.delete({ where: { id } });
  }

  // Normalize noiDung for matching (trim + NFC + case-insensitive)
  private normalizeNoiDung(s: string): string {
    return s.trim().normalize('NFC').toLowerCase();
  }

  // P1: find plan item with completed log matching record's device + noiDung in same year
  async findCompletedPlanMatch(data: {
    machineSystemId: string;
    machineSystemDetailId: string;
    noiDung: string;
    year: number;
  }): Promise<{ planId: string; maKeHoach: string } | null> {
    const normalized = this.normalizeNoiDung(data.noiDung);
    if (!normalized) return null;
    const plans = await prisma.maintenancePlan.findMany({
      where: { machineSystemId: data.machineSystemId, nam: data.year },
      select: {
        id: true,
        maKeHoach: true,
        items: {
          select: {
            id: true,
            machineSystemDetailId: true,
            noiDung: true,
            logs: { where: { hoanThanh: true }, select: { id: true } },
          },
        },
      },
    });
    for (const plan of plans) {
      for (const item of plan.items) {
        if (item.machineSystemDetailId !== data.machineSystemDetailId) continue;
        if (this.normalizeNoiDung(item.noiDung) !== normalized) continue;
        if (item.logs.length > 0) return { planId: plan.id, maKeHoach: plan.maKeHoach };
      }
    }
    return null;
  }

  // P2: transactional create with optional plan link
  async createWithOptionalPlanLink(
    data: CreateMaintenanceRecordData,
    linkPlan: { planId: string; itemId: string; thang: number; lanThu: number } | null
  ) {
    if (!linkPlan) return this.create(data);
    if (!['Bảo dưỡng', 'Sửa chữa'].includes(data.loai)) {
      throw new ValidationError('Loại phải là "Bảo dưỡng" hoặc "Sửa chữa"');
    }
    return prisma.$transaction(async (tx) => {
      // Cycle guard (reuse same logic as toggleMonth)
      const item = await tx.maintenancePlanItem.findFirst({
        where: { id: linkPlan.itemId, maintenancePlanId: linkPlan.planId },
      });
      if (!item) throw new ValidationError('Mục bảo dưỡng không thuộc kế hoạch này');
      const freqTimes: Record<string, number> = {
        HANG_NGAY: 22,
        HANG_TUAN: 4,
        HANG_THANG: 1,
        HAI_THANG: 1,
        BA_THANG: 1,
        SAU_THANG: 1,
        HANG_NAM: 1,
        KHONG_CO_DINH: 0,
      };
      const maxLan = freqTimes[item.tanSuat as string] ?? 1;
      if (maxLan === 0)
        throw new ValidationError('Tần suất KHÔNG CỐ ĐỊNH không cho phép tick hoàn thành');
      if (linkPlan.lanThu > maxLan)
        throw new ValidationError(
          `Tần suất ${item.tanSuat} chỉ cho phép tối đa ${maxLan} lần/tháng`
        );
      const applicable = this.getApplicableMonths(item.tanSuat as string, item.thangBatDau ?? 1);
      if (!applicable.includes(linkPlan.thang))
        throw new ValidationError(`Tháng ${linkPlan.thang} không thuộc chu kỳ ${item.tanSuat}`);
      const existing = await tx.maintenancePlanItemLog.findUnique({
        where: {
          maintenancePlanItemId_thang_lanThu: {
            maintenancePlanItemId: linkPlan.itemId,
            thang: linkPlan.thang,
            lanThu: linkPlan.lanThu,
          },
        },
      });
      if (existing?.hoanThanh) throw new ConflictError('Ô kế hoạch này đã hoàn thành');
      let logId: string;
      if (existing) {
        const updated = await tx.maintenancePlanItemLog.update({
          where: { id: existing.id },
          data: {
            hoanThanh: true,
            ngayThucHien: data.ngayThucHien ?? new Date(),
            nguoiThucHien: data.nguoiThucHien ?? null,
            nguoiPhu: data.nguoiPhu ?? [],
          },
        });
        logId = updated.id;
      } else {
        const created = await tx.maintenancePlanItemLog.create({
          data: {
            maintenancePlanItemId: linkPlan.itemId,
            thang: linkPlan.thang,
            lanThu: linkPlan.lanThu,
            hoanThanh: true,
            ngayThucHien: data.ngayThucHien ?? new Date(),
            nguoiThucHien: data.nguoiThucHien ?? null,
            nguoiPhu: data.nguoiPhu ?? [],
          },
        });
        logId = created.id;
      }
      const year = new Date().getFullYear();
      const last = await tx.maintenanceRecord.findFirst({
        where: { maBienBan: yearlyCodeWhere('BBBD', year) },
        orderBy: { maBienBan: 'desc' },
        select: { maBienBan: true },
      });
      const maBienBan = data.maBienBan ?? nextYearlyCode(last?.maBienBan ?? null, 'BBBD', year);
      const record = await tx.maintenanceRecord.create({
        data: {
          maBienBan,
          maintenancePlanId: linkPlan.planId,
          machineSystemId: data.machineSystemId,
          machineSystemDetailId: data.machineSystemDetailId,
          loai: data.loai,
          noiDung: data.noiDung,
          tinhTrangTruoc: data.tinhTrangTruoc,
          tinhTrangSau: data.tinhTrangSau,
          deXuat: data.deXuat,
          thoiGianThucHien: data.thoiGianThucHien,
          ngayThucHien: new Date(data.ngayThucHien),
          nguoiThucHien: data.nguoiThucHien,
          nguoiPhu: data.nguoiPhu ?? [],
          fileDinhKem: data.fileDinhKem,
          createdById: data.userId ?? null,
          sourceLogId: logId,
        },
        include: recordInclude,
      });
      return record;
    });
  }

  private getApplicableMonths(frequency: string, thangBatDau: number): number[] {
    switch (frequency) {
      case 'HAI_THANG': {
        const m: number[] = [];
        for (let i = thangBatDau; i <= 12; i += 2) m.push(i);
        return m;
      }
      case 'BA_THANG': {
        const m: number[] = [];
        for (let i = thangBatDau; i <= 12; i += 3) m.push(i);
        return m;
      }
      case 'SAU_THANG': {
        const m: number[] = [];
        for (let i = thangBatDau; i <= 12; i += 6) m.push(i);
        return m;
      }
      case 'HANG_NAM':
        return [thangBatDau];
      case 'KHONG_CO_DINH':
        return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      default:
        return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    }
  }

  async exportExcel(filters: MaintenanceRecordFilters = {}) {
    const { data } = await this.list({ ...filters, page: 1, limit: 5000 });
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Biên bản BD-SC');

    ws.columns = [
      { header: 'Mã biên bản', key: 'maBienBan', width: 16 },
      { header: 'Loại', key: 'loai', width: 12 },
      { header: 'Hệ thống', key: 'heThong', width: 20 },
      { header: 'Thiết bị', key: 'thietBi', width: 22 },
      { header: 'Nội dung', key: 'noiDung', width: 35 },
      { header: 'Trước kiểm tra', key: 'truoc', width: 25 },
      { header: 'Sau kiểm tra', key: 'sau', width: 25 },
      { header: 'Đề xuất', key: 'deXuat', width: 25 },
      { header: 'Thời gian', key: 'thoiGian', width: 14 },
      { header: 'Ngày', key: 'ngay', width: 12 },
      { header: 'Người thực hiện', key: 'nguoi', width: 16 },
      { header: 'Người phụ', key: 'nguoiPhu', width: 30 },
    ];

    for (const r of data) {
      ws.addRow({
        maBienBan: r.maBienBan,
        loai: r.loai,
        heThong: (r as any).machineSystem?.tenHeThong ?? '',
        thietBi: (r as any).machineSystemDetail?.tenChiTiet ?? '',
        noiDung: r.noiDung,
        truoc: r.tinhTrangTruoc,
        sau: r.tinhTrangSau,
        deXuat: r.deXuat ?? '',
        thoiGian: r.thoiGianThucHien ?? '',
        ngay: r.ngayThucHien,
        nguoi: r.nguoiThucHien,
        nguoiPhu: ((r as any).nguoiPhu ?? []).join(', '),
      });
    }

    return wb;
  }
}

export default new MaintenanceRecordService();
