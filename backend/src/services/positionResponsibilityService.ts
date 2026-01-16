import prisma from '@config/database';
import { NotFoundError } from '@utils/errors';

export class PositionResponsibilityService {
  async getAllResponsibilities(positionId: string): Promise<any[]> {
    // Verify position exists
    const position = await prisma.position.findUnique({
      where: { id: positionId },
    });

    if (!position) {
      throw new NotFoundError('Position not found');
    }

    return await prisma.positionResponsibility.findMany({
      where: { positionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getResponsibilityById(id: string): Promise<any> {
    const responsibility = await prisma.positionResponsibility.findUnique({
      where: { id },
    });

    if (!responsibility) {
      throw new NotFoundError('Responsibility not found');
    }

    return responsibility;
  }

  async createResponsibility(positionId: string, data: any): Promise<any> {
    // Verify position exists
    const position = await prisma.position.findUnique({
      where: { id: positionId },
    });

    if (!position) {
      throw new NotFoundError('Position not found');
    }

    return await prisma.positionResponsibility.create({
      data: {
        positionId,
        title: data.title,
        description: data.description,
        weight: data.weight || 0,
      },
    });
  }

  async updateResponsibility(id: string, data: any): Promise<any> {
    const responsibility = await prisma.positionResponsibility.findUnique({
      where: { id },
    });

    if (!responsibility) {
      throw new NotFoundError('Responsibility not found');
    }

    return await prisma.positionResponsibility.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.weight !== undefined && { weight: data.weight }),
      },
    });
  }

  async deleteResponsibility(id: string): Promise<void> {
    const responsibility = await prisma.positionResponsibility.findUnique({
      where: { id },
    });

    if (!responsibility) {
      throw new NotFoundError('Responsibility not found');
    }

    await prisma.positionResponsibility.delete({ where: { id } });
  }
}

export default new PositionResponsibilityService();

