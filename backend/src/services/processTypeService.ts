import prisma from '@config/database';
import { NotFoundError, ValidationError, ConflictError } from '@utils/errors';
import { slugifyToUpperCode } from '@utils/permissions';
import type { ProcessType } from '@prisma/client';

interface CreateProcessTypeData {
  name: string;
  thuTu?: number;
}

interface UpdateProcessTypeData {
  name?: string;
  thuTu?: number;
  kichHoat?: boolean;
}

export class ProcessTypeService {
  async getAllProcessTypes(params: { kichHoat?: boolean } = {}): Promise<ProcessType[]> {
    const where = params.kichHoat !== undefined ? { kichHoat: params.kichHoat } : {};
    return prisma.processType.findMany({
      where,
      orderBy: [{ thuTu: 'asc' }, { name: 'asc' }],
    });
  }

  async getProcessTypeById(id: string): Promise<ProcessType> {
    const row = await prisma.processType.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundError('Không tìm thấy loại quy trình');
    }
    return row;
  }

  async createProcessType(data: CreateProcessTypeData): Promise<ProcessType> {
    if (!data.name || !data.name.trim()) {
      throw new ValidationError('Tên loại quy trình là bắt buộc');
    }

    const code = slugifyToUpperCode(data.name, 'PROCTYPE');

    // Check duplicates on both name and code up front for clearer error messages
    const existing = await prisma.processType.findFirst({
      where: { OR: [{ name: data.name }, { code }] },
    });
    if (existing) {
      throw new ConflictError('Loại quy trình đã tồn tại');
    }

    return prisma.processType.create({
      data: {
        code,
        name: data.name,
        thuTu: data.thuTu ?? 0,
        kichHoat: true,
        macDinhHeThong: false,
      },
    });
  }

  async updateProcessType(id: string, data: UpdateProcessTypeData): Promise<ProcessType> {
    const row = await prisma.processType.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundError('Không tìm thấy loại quy trình');
    }

    if (row.macDinhHeThong && data.name !== undefined) {
      throw new ValidationError('Không thể đổi tên loại quy trình hệ thống');
    }

    const updateData: UpdateProcessTypeData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.thuTu !== undefined) updateData.thuTu = data.thuTu;
    if (data.kichHoat !== undefined) updateData.kichHoat = data.kichHoat;

    return prisma.processType.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteProcessType(id: string): Promise<void> {
    const row = await prisma.processType.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundError('Không tìm thấy loại quy trình');
    }

    if (row.macDinhHeThong) {
      throw new ValidationError('Không thể xóa loại quy trình hệ thống');
    }

    const inUseCount = await prisma.process.count({
      where: { loaiQuyTrinh: row.name },
    });
    if (inUseCount > 0) {
      throw new ConflictError(`Đang có ${inUseCount} quy trình dùng loại này`);
    }

    await prisma.processType.delete({ where: { id } });
  }
}

export default new ProcessTypeService();
