import prisma from '@config/database';
import { NotFoundError } from '@utils/errors';

export class PositionService {
  async getAllPositions(): Promise<any[]> {
    return await prisma.position.findMany({
      include: {
        employees: {
          select: {
            id: true,
            employeeCode: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        responsibilities: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getPositionById(id: string): Promise<any> {
    const position = await prisma.position.findUnique({
      where: { id },
      include: {
        employees: true,
        responsibilities: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!position) {
      throw new NotFoundError('Position not found');
    }

    return position;
  }

  async createPosition(data: any): Promise<any> {
    return await prisma.position.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
      },
    });
  }

  async updatePosition(id: string, data: any): Promise<any> {
    const position = await prisma.position.findUnique({ where: { id } });

    if (!position) {
      throw new NotFoundError('Position not found');
    }

    return await prisma.position.update({
      where: { id },
      data: {
        ...(data.code && { code: data.code }),
        ...(data.name && { name: data.name }),
        ...(data.description && { description: data.description }),
      },
    });
  }

  async deletePosition(id: string): Promise<void> {
    const position = await prisma.position.findUnique({ where: { id } });

    if (!position) {
      throw new NotFoundError('Position not found');
    }

    await prisma.position.delete({ where: { id } });
  }
}

export default new PositionService();

