import prisma from '@config/database';
import { NotFoundError } from '@utils/errors';
import { cacheGet, cacheSet, cacheDel, CACHE_KEYS } from '@utils/cache';

export class DepartmentService {
  async getAllDepartments(): Promise<any[]> {
    const cached = await cacheGet<any[]>(CACHE_KEYS.DEPARTMENTS);
    if (cached) return cached;

    const departments = await prisma.department.findMany({
      include: {
        subDepartments: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    await cacheSet(CACHE_KEYS.DEPARTMENTS, departments);
    return departments;
  }

  async getDepartmentById(id: string): Promise<any> {
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        subDepartments: true,
      },
    });

    if (!department) {
      throw new NotFoundError('Department not found');
    }

    return department;
  }

  async createDepartment(data: any): Promise<any> {
    const result = await prisma.department.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
      },
      include: {
        subDepartments: true,
      },
    });
    await cacheDel(CACHE_KEYS.DEPARTMENTS);
    return result;
  }

  async updateDepartment(id: string, data: any): Promise<any> {
    const department = await prisma.department.findUnique({ where: { id } });

    if (!department) {
      throw new NotFoundError('Department not found');
    }

    const result = await prisma.department.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description && { description: data.description }),
      },
      include: {
        subDepartments: true,
      },
    });
    await cacheDel(CACHE_KEYS.DEPARTMENTS);
    return result;
  }

  async deleteDepartment(id: string): Promise<void> {
    const department = await prisma.department.findUnique({ where: { id } });

    if (!department) {
      throw new NotFoundError('Department not found');
    }

    await prisma.department.delete({ where: { id } });
    await cacheDel(CACHE_KEYS.DEPARTMENTS);
  }
}

export default new DepartmentService();

