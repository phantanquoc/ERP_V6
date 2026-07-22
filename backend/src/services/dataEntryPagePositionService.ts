import prisma from '@config/database';
import { ConflictError, NotFoundError } from '@utils/errors';

export class DataEntryPagePositionService {
  /**
   * List all position mappings for a given page
   */
  async listByPage(pageKey: string) {
    const mappings = await prisma.dataEntryPagePosition.findMany({
      where: { pageKey },
      include: {
        position: {
          select: {
            id: true,
            code: true,
            name: true,
            category: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return mappings;
  }

  /**
   * Add a position mapping to a page
   * Rejects duplicate with ConflictError
   */
  async addMapping(pageKey: string, positionId: string) {
    // Check if position exists
    const position = await prisma.position.findUnique({
      where: { id: positionId },
    });

    if (!position) {
      throw new NotFoundError('Không tìm thấy vị trí');
    }

    // Check for duplicate
    const existing = await prisma.dataEntryPagePosition.findUnique({
      where: {
        pageKey_positionId: {
          pageKey,
          positionId,
        },
      },
    });

    if (existing) {
      throw new ConflictError('Vị trí này đã được gán cho trang nhập liệu');
    }

    const mapping = await prisma.dataEntryPagePosition.create({
      data: {
        pageKey,
        positionId,
      },
      include: {
        position: {
          select: {
            id: true,
            code: true,
            name: true,
            category: true,
          },
        },
      },
    });

    return mapping;
  }

  /**
   * Remove a position mapping from a page
   */
  async removeMapping(pageKey: string, positionId: string) {
    const mapping = await prisma.dataEntryPagePosition.findUnique({
      where: {
        pageKey_positionId: {
          pageKey,
          positionId,
        },
      },
    });

    if (!mapping) {
      throw new NotFoundError('Không tìm thấy mapping');
    }

    await prisma.dataEntryPagePosition.delete({
      where: {
        id: mapping.id,
      },
    });

    return { success: true };
  }
}

export default new DataEntryPagePositionService();
