import prisma from '@config/database';
import { NotFoundError } from '@utils/errors';

export class SubDepartmentService {
  async getAllSubDepartments(): Promise<any[]> {
    return await prisma.subDepartment.findMany({
      include: {
        department: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getSubDepartmentById(id: string): Promise<any> {
    const subDepartment = await prisma.subDepartment.findUnique({
      where: { id },
      include: {
        department: true,
      },
    });

    if (!subDepartment) {
      throw new NotFoundError('Sub department not found');
    }

    return subDepartment;
  }
}

export default new SubDepartmentService();
