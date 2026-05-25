import prisma from '@config/database';
import { NotFoundError, ValidationError } from '@utils/errors';

const DEFAULT_CRITERIA = [
  { code: 1, description: 'Nguyên liệu đàn hồi' },
  { code: 2, description: 'Nguyên liệu dẻo mềm' },
  { code: 3, description: 'Nguyên liệu màu vàng chanh' },
  { code: 4, description: 'Nguyên liệu màu tối do lạnh' },
  { code: 5, description: 'Nguyên liệu chín bùn > 5%' },
  { code: 6, description: 'Nguyên liệu non > 5%' },
  { code: 7, description: 'Nguyên liệu ghẻ > 5%' },
  { code: 8, description: 'Nguyên liệu trộn lẫn vật thể lạ' },
  { code: 9, description: 'Nguyên liệu không đồng đều (dày, mỏng)' },
  { code: 10, description: 'Nguyên liệu đóng đá' },
  { code: 11, description: 'Nguyên liệu bị bạc màu' },
];

export class MaterialEvaluationCriteriaService {
  async getAllCriteria() {
    const criteria = await prisma.materialEvaluationCriteria.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });

    return criteria;
  }

  // Returns the next available code considering ALL records (active + soft-deleted)
  // so the frontend never auto-generates a code that already exists in the DB
  async getNextCode(): Promise<number> {
    const maxRecord = await prisma.materialEvaluationCriteria.findFirst({
      orderBy: { code: 'desc' },
    });
    return maxRecord ? maxRecord.code + 1 : 1;
  }

  async getCriteriaById(id: string) {
    const criterion = await prisma.materialEvaluationCriteria.findUnique({
      where: { id },
    });

    if (!criterion) {
      throw new NotFoundError('Material evaluation criterion not found');
    }

    return criterion;
  }

  async createCriteria(data: { code: number; description: string }) {
    // Check if code already exists (including soft-deleted records)
    const existing = await prisma.materialEvaluationCriteria.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      if (!existing.isActive) {
        // Reactivate soft-deleted criterion with the new description
        const reactivated = await prisma.materialEvaluationCriteria.update({
          where: { id: existing.id },
          data: { description: data.description, isActive: true },
        });
        return reactivated;
      }
      throw new ValidationError('Mã tiêu chí đã tồn tại');
    }

    const criterion = await prisma.materialEvaluationCriteria.create({
      data: {
        code: data.code,
        description: data.description,
        isActive: true,
      },
    });

    return criterion;
  }

  async updateCriteria(
    id: string,
    data: { code?: number; description?: string; isActive?: boolean }
  ) {
    const existing = await prisma.materialEvaluationCriteria.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Material evaluation criterion not found');
    }

    // If code is being updated, check for uniqueness
    if (data.code !== undefined && data.code !== existing.code) {
      const codeExists = await prisma.materialEvaluationCriteria.findUnique({
        where: { code: data.code },
      });

      if (codeExists) {
        throw new ValidationError('Mã tiêu chí đã tồn tại');
      }
    }

    const criterion = await prisma.materialEvaluationCriteria.update({
      where: { id },
      data: {
        code: data.code,
        description: data.description,
        isActive: data.isActive,
      },
    });

    return criterion;
  }

  async deleteCriteria(id: string) {
    const existing = await prisma.materialEvaluationCriteria.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Material evaluation criterion not found');
    }

    // Soft delete by setting isActive to false
    await prisma.materialEvaluationCriteria.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async seedDefaultCriteria() {
    const count = await prisma.materialEvaluationCriteria.count();

    if (count > 0) {
      return { message: 'Criteria already exist, skipping seed', seeded: false };
    }

    await prisma.materialEvaluationCriteria.createMany({
      data: DEFAULT_CRITERIA.map((criterion) => ({
        code: criterion.code,
        description: criterion.description,
        isActive: true,
      })),
    });

    return { message: 'Default criteria seeded successfully', seeded: true };
  }
}

export default new MaterialEvaluationCriteriaService();

