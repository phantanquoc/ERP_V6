import prisma from '@config/database';
import { NotFoundError, ValidationError } from '@utils/errors';

export class PositionLevelService {
  async getAllLevels(): Promise<any[]> {
    return await prisma.positionLevel.findMany({
      include: {
        position: true,
      },
      orderBy: [{ position: { name: 'asc' } }, { createdAt: 'asc' }],
    });
  }

  async getAllLevelsByPosition(positionId: string): Promise<any[]> {
    // Verify position exists
    const position = await prisma.position.findUnique({ where: { id: positionId } });
    if (!position) {
      throw new NotFoundError('Position not found');
    }

    return await prisma.positionLevel.findMany({
      where: { positionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getLevelById(id: string): Promise<any> {
    const level = await prisma.positionLevel.findUnique({
      where: { id },
      include: {
        position: true,
      },
    });

    if (!level) {
      throw new NotFoundError('Position level not found');
    }

    return level;
  }

  async createLevel(positionId: string, data: any): Promise<any> {
    // Verify position exists
    const position = await prisma.position.findUnique({ where: { id: positionId } });
    if (!position) {
      throw new NotFoundError('Position not found');
    }

    // Validate data
    if (!data.level || data.baseSalary === undefined || data.kpiSalary === undefined) {
      throw new ValidationError('Level, baseSalary, and kpiSalary are required');
    }

    if (typeof data.baseSalary !== 'number' || data.baseSalary < 0) {
      throw new ValidationError('Base salary must be a positive number');
    }

    if (typeof data.kpiSalary !== 'number' || data.kpiSalary < 0) {
      throw new ValidationError('KPI salary must be a positive number');
    }

    // Check if level already exists for this position
    const existingLevel = await prisma.positionLevel.findUnique({
      where: {
        positionId_level: {
          positionId,
          level: data.level,
        },
      },
    });

    if (existingLevel) {
      throw new ValidationError(`Level "${data.level}" already exists for this position`);
    }

    return await prisma.positionLevel.create({
      data: {
        positionId,
        level: data.level,
        baseSalary: data.baseSalary,
        kpiSalary: data.kpiSalary,
      },
      include: {
        position: true,
      },
    });
  }

  async updateLevel(id: string, data: any): Promise<any> {
    const level = await prisma.positionLevel.findUnique({ where: { id } });

    if (!level) {
      throw new NotFoundError('Position level not found');
    }

    // Validate baseSalary if provided
    if (data.baseSalary !== undefined) {
      if (typeof data.baseSalary !== 'number' || data.baseSalary < 0) {
        throw new ValidationError('Base salary must be a positive number');
      }
    }

    // Validate kpiSalary if provided
    if (data.kpiSalary !== undefined) {
      if (typeof data.kpiSalary !== 'number' || data.kpiSalary < 0) {
        throw new ValidationError('KPI salary must be a positive number');
      }
    }

    // Check if new level name already exists for this position (if level is being changed)
    if (data.level && data.level !== level.level) {
      const existingLevel = await prisma.positionLevel.findUnique({
        where: {
          positionId_level: {
            positionId: level.positionId,
            level: data.level,
          },
        },
      });

      if (existingLevel) {
        throw new ValidationError(`Level "${data.level}" already exists for this position`);
      }
    }

    return await prisma.positionLevel.update({
      where: { id },
      data: {
        ...(data.level && { level: data.level }),
        ...(data.baseSalary !== undefined && { baseSalary: data.baseSalary }),
        ...(data.kpiSalary !== undefined && { kpiSalary: data.kpiSalary }),
      },
      include: {
        position: true,
      },
    });
  }

  async deleteLevel(id: string): Promise<void> {
    const level = await prisma.positionLevel.findUnique({ where: { id } });

    if (!level) {
      throw new NotFoundError('Position level not found');
    }

    await prisma.positionLevel.delete({ where: { id } });
  }
}

export default new PositionLevelService();

