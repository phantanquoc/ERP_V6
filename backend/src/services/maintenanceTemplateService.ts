import { Prisma } from '@prisma/client';
import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError } from '@utils/errors';

const templateInclude = {
  machineSystemDetail: {
    select: { id: true, maChiTiet: true, tenChiTiet: true, machineSystemId: true },
  },
} satisfies Prisma.MaintenanceTemplateInclude;

export interface MaintenanceTemplateFilters {
  page?: number;
  limit?: number;
  search?: string;
  machineSystemDetailId?: string;
  machineSystemId?: string;
  hoatDong?: boolean;
}

export interface CreateMaintenanceTemplateData {
  machineSystemDetailId?: string;
  noiDung: string;
  tanSuat?: string;
  toThucHien?: string;
}

export type UpdateMaintenanceTemplateData = Partial<CreateMaintenanceTemplateData> & { hoatDong?: boolean };

class MaintenanceTemplateService {
  async list(filters: MaintenanceTemplateFilters = {}) {
    const page = filters.page ?? 1;
    const { skip, limit } = getPaginationParams(page, filters.limit ?? 50);
    const where: Prisma.MaintenanceTemplateWhereInput = {};

    if (filters.machineSystemDetailId) where.machineSystemDetailId = filters.machineSystemDetailId;
    if (filters.machineSystemId) {
      where.machineSystemDetail = { machineSystemId: filters.machineSystemId };
    }
    if (filters.hoatDong !== undefined) where.hoatDong = filters.hoatDong;
    if (filters.search) {
      where.noiDung = { contains: filters.search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      prisma.maintenanceTemplate.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: templateInclude }),
      prisma.maintenanceTemplate.count({ where }),
    ]);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string) {
    const template = await prisma.maintenanceTemplate.findUnique({ where: { id }, include: templateInclude });
    if (!template) throw new NotFoundError('Không tìm thấy template bảo dưỡng');
    return template;
  }

  async create(data: CreateMaintenanceTemplateData) {
    return prisma.maintenanceTemplate.create({
      data: {
        machineSystemDetailId: data.machineSystemDetailId || null,
        noiDung: data.noiDung,
        tanSuat: (data.tanSuat as any) || 'BA_THANG',
        toThucHien: (data.toThucHien as any) || 'CO_KHI',
      },
      include: templateInclude,
    });
  }

  async update(id: string, data: UpdateMaintenanceTemplateData) {
    await this.getById(id);
    return prisma.maintenanceTemplate.update({
      where: { id },
      data: {
        machineSystemDetailId: data.machineSystemDetailId,
        noiDung: data.noiDung,
        tanSuat: data.tanSuat as any,
        toThucHien: data.toThucHien as any,
        hoatDong: data.hoatDong,
      },
      include: templateInclude,
    });
  }

  async delete(id: string) {
    await this.getById(id);
    const referenced = await prisma.maintenancePlanItem.count({ where: { maintenanceTemplateId: id } });
    if (referenced > 0) {
      return prisma.maintenanceTemplate.update({ where: { id }, data: { hoatDong: false }, include: templateInclude });
    }
    return prisma.maintenanceTemplate.delete({ where: { id } });
  }
}

export default new MaintenanceTemplateService();