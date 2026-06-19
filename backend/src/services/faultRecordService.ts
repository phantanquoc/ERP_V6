import { Prisma } from '@prisma/client';
import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError, ValidationError } from '@utils/errors';
import { nextYearlyCode, yearlyCodeWhere } from '@utils/codeGenerator';
import ExcelJS from 'exceljs';

interface CreateFaultRecordData {
  tenLoi?: string;
  moTa?: string;
  maHeThong?: string;
  machineSystemId?: string;
  machineSystemDetailId?: string;
  faultTemplateId?: string;
  mucDo?: string;
  trangThai?: string;
  nguoiPhatHien: string;
  ngayPhatHien?: Date;
  fileDinhKem?: string;
}

interface UpdateFaultRecordData {
  tenLoi?: string;
  moTa?: string;
  maHeThong?: string;
  machineSystemId?: string | null;
  machineSystemDetailId?: string | null;
  faultTemplateId?: string | null;
  mucDo?: string;
  trangThai?: string;
  nguoiPhatHien?: string;
  ngayPhatHien?: Date;
  fileDinhKem?: string;
}

const faultRecordInclude = {
  machineSystem: true,
  machineSystemDetail: true,
  faultTemplate: true,
} satisfies Prisma.FaultRecordInclude;

const faultRecordListSelect = {
  id: true,
  maLoi: true,
  tenLoi: true,
  moTa: true,
  maHeThong: true,
  machineSystemId: true,
  machineSystemDetailId: true,
  faultTemplateId: true,
  mucDo: true,
  trangThai: true,
  nguoiPhatHien: true,
  ngayPhatHien: true,
  fileDinhKem: true,
  createdAt: true,
  updatedAt: true,
  machineSystem: {
    select: { id: true, maHeThong: true, tenHeThong: true, khuVuc: true, viTri: true },
  },
  machineSystemDetail: {
    select: { id: true, maChiTiet: true, tenChiTiet: true, loaiChiTiet: true },
  },
  faultTemplate: {
    select: { id: true, maMauLoi: true, tenMauLoi: true, mucDo: true },
  },
} satisfies Prisma.FaultRecordSelect;

class FaultRecordService {
  async generateFaultCode(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await prisma.faultRecord.findFirst({
      where: { maLoi: yearlyCodeWhere('LI', year) },
      orderBy: { maLoi: 'desc' },
      select: { maLoi: true },
    });
    return nextYearlyCode(last?.maLoi ?? null, 'LI', year);
  }

  async getAllFaultRecords(
    page: number = 1,
    limit: number = 10,
    search?: string,
    trangThai?: string,
    mucDo?: string,
    machineSystemId?: string,
    machineSystemDetailId?: string,
    faultTemplateId?: string,
  ) {
    const { skip, limit: limitNum } = getPaginationParams(page, limit);

    const where: Record<string, unknown> = {};
    if (trangThai) where.trangThai = trangThai;
    if (mucDo) where.mucDo = mucDo;
    if (machineSystemId) where.machineSystemId = machineSystemId;
    if (machineSystemDetailId) where.machineSystemDetailId = machineSystemDetailId;
    if (faultTemplateId) where.faultTemplateId = faultTemplateId;
    if (search) {
      where.OR = [
        { maLoi: { contains: search, mode: 'insensitive' } },
        { tenLoi: { contains: search, mode: 'insensitive' } },
        { maHeThong: { contains: search, mode: 'insensitive' } },
        { nguoiPhatHien: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.faultRecord.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: faultRecordListSelect,
      }),
      prisma.faultRecord.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    };
  }

  async getFaultRecordById(id: string) {
    const record = await prisma.faultRecord.findUnique({ where: { id }, include: faultRecordInclude });
    if (!record) throw new NotFoundError('Không tìm thấy bản ghi lỗi');
    return record;
  }

  private async resolveMachineContext(data: {
    maHeThong?: string | null;
    machineSystemId?: string | null;
    machineSystemDetailId?: string | null;
    faultTemplateId?: string | null;
  }) {
    if (data.faultTemplateId) {
      const template = await prisma.faultTemplate.findUnique({
        where: { id: data.faultTemplateId },
        include: { machineSystem: true, machineSystemDetail: true },
      });
      if (!template) throw new ValidationError('Mẫu lỗi không hợp lệ');
      if (!template.hoatDong) throw new ValidationError('Mẫu lỗi đã ngừng hoạt động');
      return {
        template,
        machineSystem: template.machineSystem,
        machineSystemDetail: template.machineSystemDetail,
        maHeThong: template.machineSystem?.maHeThong ?? null,
      };
    }

    let machineSystem = data.machineSystemId
      ? await prisma.machineSystem.findUnique({ where: { id: data.machineSystemId } })
      : null;

    if (!machineSystem && data.maHeThong) {
      machineSystem = await prisma.machineSystem.findUnique({ where: { maHeThong: data.maHeThong } });
    }

    if (!machineSystem && data.machineSystemDetailId) {
      const detail = await prisma.machineSystemDetail.findUnique({
        where: { id: data.machineSystemDetailId },
        include: { machineSystem: true },
      });
      if (!detail) throw new ValidationError('Chi tiết hệ thống máy không hợp lệ');
      machineSystem = detail.machineSystem;
    }

    if (data.machineSystemId && !machineSystem) {
      throw new ValidationError('Hệ thống máy không hợp lệ');
    }

    let machineSystemDetail = null;
    if (data.machineSystemDetailId) {
      machineSystemDetail = await prisma.machineSystemDetail.findUnique({
        where: { id: data.machineSystemDetailId },
      });
      if (!machineSystemDetail) throw new ValidationError('Chi tiết hệ thống máy không hợp lệ');
      if (machineSystem && machineSystemDetail.machineSystemId !== machineSystem.id) {
        throw new ValidationError('Chi tiết máy không thuộc hệ thống máy đã chọn');
      }
    }

    if (data.maHeThong && machineSystem && data.maHeThong !== machineSystem.maHeThong) {
      throw new ValidationError('Mã hệ thống không khớp với hệ thống máy đã chọn');
    }

    return {
      template: null,
      machineSystem,
      machineSystemDetail,
      maHeThong: machineSystem?.maHeThong ?? data.maHeThong ?? null,
    };
  }

  async createFaultRecord(data: CreateFaultRecordData) {
    const maLoi = await this.generateFaultCode();
    const context = await this.resolveMachineContext(data);
    const tenLoi = data.tenLoi ?? context.template?.tenMauLoi;
    const mucDo = data.mucDo ?? context.template?.mucDo;
    if (!tenLoi) throw new ValidationError('Tên lỗi là bắt buộc');
    if (!mucDo) throw new ValidationError('Mức độ lỗi là bắt buộc');

    return prisma.faultRecord.create({
      data: {
        maLoi,
        tenLoi,
        moTa: data.moTa ?? context.template?.moTa ?? '',
        maHeThong: context.maHeThong,
        machineSystemId: context.machineSystem?.id,
        machineSystemDetailId: context.machineSystemDetail?.id,
        faultTemplateId: context.template?.id,
        mucDo,
        trangThai: data.trangThai ?? 'Đang theo dõi',
        nguoiPhatHien: data.nguoiPhatHien,
        ngayPhatHien: data.ngayPhatHien ?? new Date(),
        fileDinhKem: data.fileDinhKem,
      },
      include: faultRecordInclude,
    });
  }

  async updateFaultRecord(id: string, data: UpdateFaultRecordData) {
    await this.getFaultRecordById(id);
    const needsContext =
      data.faultTemplateId !== undefined ||
      data.machineSystemId !== undefined ||
      data.machineSystemDetailId !== undefined ||
      data.maHeThong !== undefined;

    const context = needsContext
      ? await this.resolveMachineContext({
          faultTemplateId: data.faultTemplateId,
          machineSystemId: data.machineSystemId,
          machineSystemDetailId: data.machineSystemDetailId,
          maHeThong: data.maHeThong,
        })
      : null;

    return prisma.faultRecord.update({
      where: { id },
      data: {
        tenLoi: data.tenLoi ?? (context?.template ? context.template.tenMauLoi : undefined),
        moTa: data.moTa ?? (context?.template ? context.template.moTa : undefined),
        maHeThong: context ? context.maHeThong : data.maHeThong,
        machineSystemId: needsContext ? context?.machineSystem?.id ?? null : undefined,
        machineSystemDetailId: needsContext ? context?.machineSystemDetail?.id ?? null : undefined,
        faultTemplateId: needsContext ? context?.template?.id ?? null : undefined,
        mucDo: data.mucDo ?? (context?.template ? context.template.mucDo : undefined),
        trangThai: data.trangThai,
        nguoiPhatHien: data.nguoiPhatHien,
        ngayPhatHien: data.ngayPhatHien,
        fileDinhKem: data.fileDinhKem,
      },
      include: faultRecordInclude,
    });
  }

  async deleteFaultRecord(id: string) {
    await this.getFaultRecordById(id);
    return prisma.faultRecord.delete({ where: { id } });
  }

  async exportToExcel(filters?: { search?: string; trangThai?: string; mucDo?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.trangThai) where.trangThai = filters.trangThai;
    if (filters?.mucDo) where.mucDo = filters.mucDo;
    if (filters?.search) {
      where.OR = [
        { maLoi: { contains: filters.search, mode: 'insensitive' } },
        { tenLoi: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const data = await prisma.faultRecord.findMany({ where, orderBy: { createdAt: 'desc' } });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Danh sách lỗi');

    sheet.columns = [
      { header: 'STT', key: 'stt', width: 6 },
      { header: 'Mã lỗi', key: 'maLoi', width: 15 },
      { header: 'Tên lỗi', key: 'tenLoi', width: 30 },
      { header: 'Mô tả', key: 'moTa', width: 40 },
      { header: 'Mã hệ thống', key: 'maHeThong', width: 15 },
      { header: 'Mức độ', key: 'mucDo', width: 15 },
      { header: 'Trạng thái', key: 'trangThai', width: 15 },
      { header: 'Người phát hiện', key: 'nguoiPhatHien', width: 20 },
      { header: 'Ngày phát hiện', key: 'ngayPhatHien', width: 15 },
    ];

    data.forEach((item: (typeof data)[0], index: number) => {
      sheet.addRow({
        stt: index + 1,
        maLoi: item.maLoi,
        tenLoi: item.tenLoi,
        moTa: item.moTa,
        maHeThong: item.maHeThong ?? '',
        mucDo: item.mucDo,
        trangThai: item.trangThai,
        nguoiPhatHien: item.nguoiPhatHien,
        ngayPhatHien: item.ngayPhatHien.toLocaleDateString('vi-VN'),
      });
    });

    return workbook;
  }
}

export default new FaultRecordService();
