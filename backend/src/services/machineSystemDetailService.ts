import { MachineSystemDetailType, Prisma } from '@prisma/client';
import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { ConflictError, NotFoundError, ValidationError } from '@utils/errors';
import { nextStaticCode, staticCodeWhere } from '@utils/codeGenerator';

const detailInclude = {
  machineSystem: true,
  parentDetail: true,
  childDetails: { orderBy: { thuTu: 'asc' as const } },
} satisfies Prisma.MachineSystemDetailInclude;

const detailTypeMap: Record<string, MachineSystemDetailType> = {
  THIET_BI: MachineSystemDetailType.THIET_BI,
  'Thiet bi': MachineSystemDetailType.THIET_BI,
  CUM: MachineSystemDetailType.CUM,
  Cum: MachineSystemDetailType.CUM,
  LINH_KIEN: MachineSystemDetailType.LINH_KIEN,
  'Linh kien': MachineSystemDetailType.LINH_KIEN,
  DIEM_KIEM_TRA: MachineSystemDetailType.DIEM_KIEM_TRA,
  'Diem kiem tra': MachineSystemDetailType.DIEM_KIEM_TRA,
};

export interface MachineSystemDetailFilters {
  page?: number;
  limit?: number;
  search?: string;
  machineSystemId?: string;
  loaiChiTiet?: string;
  hoatDong?: boolean;
  trangThai?: string;
}

export interface CreateMachineSystemDetailData {
  machineSystemId: string;
  parentDetailId?: string | null;
  loaiChiTiet: string;
  maChiTiet: string;
  tenChiTiet: string;
  viTri?: string;
  moTa?: string;
  maNguoiPhuTrach?: string;
  nguoiPhuTrach?: string;
  fileDinhKem?: string;
  thuTu?: number;
  hoatDong?: boolean;
  trangThai?: string;
}

export type UpdateMachineSystemDetailData = Partial<CreateMachineSystemDetailData>;

const DETAIL_TYPE_PREFIX: Record<MachineSystemDetailType, string> = {
  [MachineSystemDetailType.THIET_BI]: 'TB',
  [MachineSystemDetailType.CUM]: 'CUM',
  [MachineSystemDetailType.LINH_KIEN]: 'LK',
  [MachineSystemDetailType.DIEM_KIEM_TRA]: 'DKT',
};

class MachineSystemDetailService {
  private parseDetailType(value?: string): MachineSystemDetailType | undefined {
    if (value === undefined) return undefined;
    const parsed = detailTypeMap[value];
    if (!parsed) {
      throw new ValidationError('Loại chi tiết hệ thống máy không hợp lệ');
    }
    return parsed;
  }

  async generateCode(loaiChiTiet: string): Promise<string> {
    const type = this.parseDetailType(loaiChiTiet);
    if (!type) throw new ValidationError('Loại chi tiết không hợp lệ');
    const prefix = DETAIL_TYPE_PREFIX[type];
    const last = await prisma.machineSystemDetail.findFirst({
      where: { maChiTiet: staticCodeWhere(prefix) },
      orderBy: { maChiTiet: 'desc' },
      select: { maChiTiet: true },
    });
    return nextStaticCode(last?.maChiTiet ?? null, prefix);
  }

  private async ensureMachineSystem(machineSystemId: string, tx: Prisma.TransactionClient = prisma) {
    const machineSystem = await tx.machineSystem.findUnique({ where: { id: machineSystemId } });
    if (!machineSystem) throw new NotFoundError('Không tìm thấy hệ thống máy');
    return machineSystem;
  }

  private async validateParent(
    machineSystemId: string,
    parentDetailId?: string | null,
    currentDetailId?: string,
    tx: Prisma.TransactionClient = prisma,
  ): Promise<void> {
    if (!parentDetailId) return;
    if (parentDetailId === currentDetailId) {
      throw new ValidationError('Chi tiết cha không được trùng với chi tiết hiện tại');
    }

    const parent = await tx.machineSystemDetail.findUnique({
      where: { id: parentDetailId },
      select: { id: true, machineSystemId: true, parentDetailId: true },
    });
    if (!parent) throw new NotFoundError('Không tìm thấy chi tiết cha');
    if (parent.machineSystemId !== machineSystemId) {
      throw new ValidationError('Chi tiết cha phải thuộc cùng hệ thống máy');
    }

    let cursor = parent.parentDetailId;
    while (cursor) {
      if (cursor === currentDetailId) {
        throw new ValidationError('Không được tạo vòng lặp trong cây chi tiết hệ thống máy');
      }
      const ancestor = await tx.machineSystemDetail.findUnique({
        where: { id: cursor },
        select: { parentDetailId: true },
      });
      cursor = ancestor?.parentDetailId ?? null;
    }
  }

  async list(filters: MachineSystemDetailFilters = {}) {
    const page = filters.page ?? 1;
    const { skip, limit } = getPaginationParams(page, filters.limit ?? 10);
    const where: Prisma.MachineSystemDetailWhereInput = {};

    if (filters.machineSystemId) where.machineSystemId = filters.machineSystemId;
    if (filters.loaiChiTiet) where.loaiChiTiet = this.parseDetailType(filters.loaiChiTiet);
    if (filters.hoatDong !== undefined) where.hoatDong = filters.hoatDong;
    if (filters.trangThai) where.trangThai = filters.trangThai;
    if (filters.search) {
      where.OR = [
        { maChiTiet: { contains: filters.search, mode: 'insensitive' } },
        { tenChiTiet: { contains: filters.search, mode: 'insensitive' } },
        { viTri: { contains: filters.search, mode: 'insensitive' } },
        { machineSystem: { maHeThong: { contains: filters.search, mode: 'insensitive' } } },
        { machineSystem: { tenHeThong: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.machineSystemDetail.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ machineSystemId: 'asc' }, { thuTu: 'asc' }, { createdAt: 'desc' }],
        include: detailInclude,
      }),
      prisma.machineSystemDetail.count({ where }),
    ]);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string) {
    const detail = await prisma.machineSystemDetail.findUnique({ where: { id }, include: detailInclude });
    if (!detail) throw new NotFoundError('Không tìm thấy chi tiết hệ thống máy');
    return detail;
  }

  async create(data: CreateMachineSystemDetailData) {
    const loaiChiTiet = this.parseDetailType(data.loaiChiTiet);
    await this.ensureMachineSystem(data.machineSystemId);
    await this.validateParent(data.machineSystemId, data.parentDetailId);

    const maChiTiet = data.maChiTiet || await this.generateCode(data.loaiChiTiet);

    return prisma.machineSystemDetail.create({
      data: {
        machineSystemId: data.machineSystemId,
        parentDetailId: data.parentDetailId ?? null,
        loaiChiTiet: loaiChiTiet!,
        maChiTiet,
        tenChiTiet: data.tenChiTiet,
        viTri: data.viTri,
        moTa: data.moTa,
        maNguoiPhuTrach: data.maNguoiPhuTrach,
        nguoiPhuTrach: data.nguoiPhuTrach,
        fileDinhKem: data.fileDinhKem,
        thuTu: data.thuTu ?? 0,
        hoatDong: data.hoatDong ?? true,
        trangThai: data.trangThai ?? 'Hoạt động',
      },
      include: detailInclude,
    });
  }

  async update(id: string, data: UpdateMachineSystemDetailData) {
    const existing = await this.getById(id);
    const machineSystemId = data.machineSystemId ?? existing.machineSystemId;
    if (data.machineSystemId) await this.ensureMachineSystem(data.machineSystemId);
    await this.validateParent(
      machineSystemId,
      data.parentDetailId !== undefined ? data.parentDetailId : existing.parentDetailId,
      id,
    );

    const updateData: Prisma.MachineSystemDetailUpdateInput = {
      parentDetail: data.parentDetailId !== undefined
        ? data.parentDetailId
          ? { connect: { id: data.parentDetailId } }
          : { disconnect: true }
        : undefined,
      machineSystem: data.machineSystemId ? { connect: { id: data.machineSystemId } } : undefined,
      loaiChiTiet: data.loaiChiTiet ? this.parseDetailType(data.loaiChiTiet) : undefined,
      maChiTiet: data.maChiTiet,
      tenChiTiet: data.tenChiTiet,
      viTri: data.viTri,
      moTa: data.moTa,
      maNguoiPhuTrach: data.maNguoiPhuTrach,
      nguoiPhuTrach: data.nguoiPhuTrach,
      fileDinhKem: data.fileDinhKem,
      thuTu: data.thuTu,
      hoatDong: data.hoatDong,
      trangThai: data.trangThai,
    };

    return prisma.machineSystemDetail.update({ where: { id }, data: updateData, include: detailInclude });
  }

  async deactivate(id: string) {
    await this.getById(id);
    return prisma.machineSystemDetail.update({
      where: { id },
      data: { hoatDong: false, trangThai: 'Ngừng hoạt động' },
      include: detailInclude,
    });
  }

  async getTree(machineSystemId: string) {
    await this.ensureMachineSystem(machineSystemId);
    return prisma.machineSystemDetail.findMany({
      where: { machineSystemId },
      orderBy: [{ thuTu: 'asc' }, { createdAt: 'asc' }],
      include: detailInclude,
    });
  }

  async delete(id: string) {
    await this.getById(id);
    const [faultRecords, faultTemplates, repairItems, handoverItems] = await Promise.all([
      prisma.faultRecord.count({ where: { machineSystemDetailId: id } }),
      prisma.faultTemplate.count({ where: { machineSystemDetailId: id } }),
      prisma.repairRequestItem.count({ where: { machineSystemDetailId: id } }),
      prisma.acceptanceHandoverItem.count({ where: { machineSystemDetailId: id } }),
    ]);

    if (faultRecords + faultTemplates + repairItems + handoverItems > 0) {
      throw new ConflictError('Chi tiết hệ thống máy đã được sử dụng, vui lòng ngừng hoạt động thay vì xóa');
    }

    return prisma.machineSystemDetail.delete({ where: { id } });
  }
}

export default new MachineSystemDetailService();
