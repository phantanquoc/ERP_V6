import { Prisma } from '@prisma/client';
import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError, ValidationError } from '@utils/errors';
import { nextYearlyCode, yearlyCodeWhere } from '@utils/codeGenerator';

const faultTemplateInclude = {
  machineSystem: true,
  machineSystemDetail: true,
  _count: { select: { faultRecords: true } },
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

export interface CreateFaultTemplateData {
  maMauLoi?: string;
  tenMauLoi: string;
  moTa: string;
  mucDo: string;
  machineSystemId?: string;
  machineSystemDetailId: string;
  hoatDong?: boolean;
  trangThai?: string;
  ghiChu?: string;
  fileDinhKem?: string;
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
    machineSystemDetailId: string,
    machineSystemId?: string,
    requireActive = true,
    tx: Prisma.TransactionClient = prisma,
  ) {
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

  async create(data: CreateFaultTemplateData) {
    const detail = await this.validateMachineDetail(data.machineSystemDetailId, data.machineSystemId);
    const maMauLoi = data.maMauLoi ?? await this.generateTemplateCode();

    return prisma.faultTemplate.create({
      data: {
        maMauLoi,
        tenMauLoi: data.tenMauLoi,
        moTa: data.moTa,
        mucDo: data.mucDo,
        machineSystemId: detail.machineSystemId,
        machineSystemDetailId: detail.id,
        hoatDong: data.hoatDong ?? true,
        trangThai: data.trangThai ?? 'Hoạt động',
        ghiChu: data.ghiChu,
        fileDinhKem: data.fileDinhKem,
      },
      include: faultTemplateInclude,
    });
  }

  async update(id: string, data: UpdateFaultTemplateData) {
    const existing = await this.getById(id);
    let machineSystemId = data.machineSystemId ?? existing.machineSystemId;
    let machineSystemDetailId = data.machineSystemDetailId ?? existing.machineSystemDetailId;

    if (data.machineSystemDetailId || data.machineSystemId) {
      const detail = await this.validateMachineDetail(machineSystemDetailId, machineSystemId);
      machineSystemId = detail.machineSystemId;
      machineSystemDetailId = detail.id;
    }

    return prisma.faultTemplate.update({
      where: { id },
      data: {
        maMauLoi: data.maMauLoi,
        tenMauLoi: data.tenMauLoi,
        moTa: data.moTa,
        mucDo: data.mucDo,
        machineSystemId,
        machineSystemDetailId,
        hoatDong: data.hoatDong,
        trangThai: data.trangThai,
        ghiChu: data.ghiChu,
        fileDinhKem: data.fileDinhKem,
      },
      include: faultTemplateInclude,
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
