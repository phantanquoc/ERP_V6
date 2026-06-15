import { Prisma } from '@prisma/client';
import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError, ValidationError } from '@utils/errors';
import { nextYearlyCode, yearlyCodeWhere } from '@utils/codeGenerator';
import ExcelJS from 'exceljs';

export interface MaintenanceRecordFilters {
  page?: number;
  limit?: number;
  machineSystemId?: string;
  machineSystemDetailId?: string;
  loai?: string;
  maintenancePlanId?: string;
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
  fileDinhKem?: string;
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
    if (filters.startDate || filters.endDate) {
      where.ngayThucHien = {};
      if (filters.startDate) where.ngayThucHien.gte = new Date(filters.startDate);
      if (filters.endDate) where.ngayThucHien.lte = new Date(filters.endDate);
    }
    if (filters.search) {
      where.OR = [
        { maBienBan: { contains: filters.search, mode: 'insensitive' } },
        { noiDung: { contains: filters.search, mode: 'insensitive' } },
        { nguoiThucHien: { contains: filters.search, mode: 'insensitive' } },
        { machineSystemDetail: { tenChiTiet: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.maintenanceRecord.findMany({ where, skip, take: limit, orderBy: { ngayThucHien: 'desc' }, include: recordInclude }),
      prisma.maintenanceRecord.count({ where }),
    ]);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string) {
    const record = await prisma.maintenanceRecord.findUnique({ where: { id }, include: recordInclude });
    if (!record) throw new NotFoundError('Không tìm thấy biên bản bảo dưỡng');
    return record;
  }

  async create(data: CreateMaintenanceRecordData) {
    if (!['Bảo dưỡng', 'Sửa chữa'].includes(data.loai)) {
      throw new ValidationError('Loại phải là "Bảo dưỡng" hoặc "Sửa chữa"');
    }
    const maBienBan = data.maBienBan ?? await this.generateCode();

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
        fileDinhKem: data.fileDinhKem,
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
        fileDinhKem: data.fileDinhKem,
      },
      include: recordInclude,
    });
  }

  async delete(id: string) {
    await this.getById(id);
    return prisma.maintenanceRecord.delete({ where: { id } });
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
      });
    }

    return wb;
  }
}

export default new MaintenanceRecordService();

