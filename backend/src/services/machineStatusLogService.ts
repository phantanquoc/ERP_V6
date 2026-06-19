import { MachineStatus } from '@prisma/client';
import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError } from '@utils/errors';

export interface MachineStatusLogFilters {
  page?: number;
  limit?: number;
  machineSystemId?: string;
  trangThaiMoi?: MachineStatus;
  fromDate?: Date;
  toDate?: Date;
}

class MachineStatusLogService {
  async getAllLogs(filters: MachineStatusLogFilters = {}) {
    const page = filters.page ?? 1;
    const { skip, limit } = getPaginationParams(page, filters.limit ?? 10);

    const where: {
      machineSystemId?: string;
      trangThaiMoi?: MachineStatus;
      thoiDiem?: { gte?: Date; lte?: Date };
    } = {};

    if (filters.machineSystemId) where.machineSystemId = filters.machineSystemId;
    if (filters.trangThaiMoi) where.trangThaiMoi = filters.trangThaiMoi;
    if (filters.fromDate || filters.toDate) {
      where.thoiDiem = {};
      if (filters.fromDate) where.thoiDiem.gte = filters.fromDate;
      if (filters.toDate) where.thoiDiem.lte = filters.toDate;
    }

    const [data, total] = await Promise.all([
      prisma.machineStatusLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { thoiDiem: 'desc' },
        include: {
          machineSystem: {
            select: { id: true, maHeThong: true, tenHeThong: true, khuVuc: true, viTri: true },
          },
        },
      }),
      prisma.machineStatusLog.count({ where }),
    ]);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getLogById(id: string) {
    const log = await prisma.machineStatusLog.findUnique({
      where: { id },
      include: { machineSystem: true },
    });
    if (!log) throw new NotFoundError('Không tìm thấy nhật ký trạng thái máy');
    return log;
  }
}

export default new MachineStatusLogService();
