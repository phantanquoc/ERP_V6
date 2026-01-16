import prisma from '@config/database';
import { NotFoundError } from '@utils/errors';

export class DepartmentService {
  async getAllDepartments(): Promise<any[]> {
    return await prisma.department.findMany({
      include: {
        subDepartments: true,
      },
      orderBy: { createdAt: 'asc' },
    });
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
    return await prisma.department.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
      },
      include: {
        subDepartments: true,
      },
    });
  }

  async updateDepartment(id: string, data: any): Promise<any> {
    const department = await prisma.department.findUnique({ where: { id } });

    if (!department) {
      throw new NotFoundError('Department not found');
    }

    return await prisma.department.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description && { description: data.description }),
      },
      include: {
        subDepartments: true,
      },
    });
  }

  async deleteDepartment(id: string): Promise<void> {
    const department = await prisma.department.findUnique({ where: { id } });

    if (!department) {
      throw new NotFoundError('Department not found');
    }

    await prisma.department.delete({ where: { id } });
  }
}

export default new DepartmentService();

